export const SLOW_MS = 1500
export const CHECKLIST_STEPS = [
  { id: 'pet', label: 'Cadastrar ou editar um pet e conferir os dados salvos' },
  { id: 'weight', label: 'Registrar pesagem e conferir a data e o gráfico' },
  { id: 'feeding', label: 'Salvar o plano alimentar e conferir a porção' },
  { id: 'health', label: 'Registrar e consultar um compromisso de saúde' },
  { id: 'persistence', label: 'Sair e entrar novamente: nome, ícone, cor e alterações continuam salvos' },
  { id: 'feedback', label: 'Enviar uma avaliação de tela e consultar o retorno' },
]
export const appRelease = env => String(env.RAILWAY_GIT_COMMIT_SHA || env.APP_RELEASE || 'local').slice(0, 120)
export const safeRoute = value => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
  ? value.split(/[?#]/)[0].replace(/\/[a-f0-9]{8}-[a-f0-9-]{27,36}(?=\/|$)/gi, '/:id').slice(0, 160) : '/não-informada'
const parse = value => { try { const data = JSON.parse(value || '{}'); return data && typeof data === 'object' && !Array.isArray(data) ? data : {} } catch { return {} } }
const metadata = "CASE WHEN json_valid(details) THEN details ELSE '{}' END"
const version = `COALESCE(NULLIF(json_extract(${metadata},'$.serverRelease'),''),'unknown')`
const status = `CAST(json_extract(${metadata},'$.status') AS INTEGER)`
const route = `COALESCE(NULLIF(json_extract(${metadata},'$.route'),''),'/não-informada')`
const failure = `(event IN ('save_error','network_error','client_error') OR (event='api_response' AND ${status}>=400))`

export function readTestAnalytics(store, env, params, accountIds) {
  const db = store.raw, days = Number(params.get('days') || 7), selectedRelease = params.get('release') || 'all'
  const offset = Number(params.get('offset') || 0), detail = params.get('detail')
  if (![1, 7, 30].includes(days) || !/^[a-zA-Z0-9._-]{1,120}$/.test(selectedRelease) || !Number.isSafeInteger(offset) || offset < 0 || offset > 1000000 || (detail && !['incidents','responses','writes','feedback','checklists'].includes(detail))) throw new RangeError('Filtro de análise inválido')
  const ids = accountIds || db.prepare('SELECT account_id FROM lab_accounts').all().map(a => a.account_id)
  const scope = ids.length ? `account_id IN (${ids.map(() => '?').join(',')})` : '0=1'
  const now = Date.now(), from = now - days * 86400000, baseValues = [...ids, from, now]
  const base = `${scope} AND created_at>=? AND created_at<=?`
  const selected = base + (selectedRelease === 'all' ? '' : ` AND ${version}=?`)
  const values = selectedRelease === 'all' ? baseValues : [...baseValues, selectedRelease]
  const all = (sql, args = values) => db.prepare(sql).all(...args)
  const one = (sql, args = values) => db.prepare(sql).get(...args)
  const labels = new Map(ids.map(id => {
    const account = db.prepare('SELECT email FROM pilot_accounts WHERE id=?').get(id)
    return [id, account?.email?.split('@')[0] || 'Conta de teste']
  }))
  function eventRow(row) {
    const data = parse(row.details)
    return { id: row.id, accountId: row.account_id, account: labels.get(row.account_id), deviceId: row.device_id, event: row.event, durationMs: row.duration_ms, createdAt: row.created_at,
      details: { route: safeRoute(data.route), method: data.method, status: data.status, requestId: data.requestId, serverRelease: data.serverRelease || 'unknown', clientRelease: data.clientRelease || 'unknown', message: typeof data.message === 'string' ? data.message.slice(0, 300) : undefined } }
  }
  const incidentCTE = `WITH ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY account_id,COALESCE(device_id,''),COALESCE(NULLIF(json_extract(${metadata},'$.requestId'),''),id) ORDER BY created_at DESC,id DESC) rank FROM pilot_events WHERE ${selected} AND ${failure})`
  function eventPage(kind) {
    const rows = kind === 'incidents'
      ? all(incidentCTE + ' SELECT * FROM ranked WHERE rank=1 ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET ?', [...values, offset])
      : all(`SELECT * FROM pilot_events WHERE ${selected} AND event='api_response'${kind==='writes'?` AND ${status}>=400 AND json_extract(${metadata},'$.method') IN ('POST','PATCH','DELETE')`:''} ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET ?`, [...values, offset])
    return { items: rows.slice(0, 50).map(eventRow), nextOffset: rows.length > 50 ? offset + 50 : null }
  }
  function recordPage(collection) {
    const recordWhere = `${scope} AND collection=? AND updated_at>=? AND updated_at<=?` + (selectedRelease === 'all' ? '' : " AND COALESCE(NULLIF(json_extract(data,'$.release'),''),'unknown')=?")
    const args = [...ids, collection, new Date(from).toISOString(), new Date(now).toISOString(), ...(selectedRelease === 'all' ? [] : [selectedRelease])]
    const rows = all(`SELECT id,account_id,data,created_at,updated_at FROM pilot_records WHERE ${recordWhere} ORDER BY updated_at DESC,id DESC LIMIT 51 OFFSET ?`, [...args, offset])
    return { items: rows.slice(0, 50).map(r => ({ id: r.id, accountId: r.account_id, account: labels.get(r.account_id), data: parse(r.data), createdAt: r.created_at, updatedAt: r.updated_at })), nextOffset: rows.length > 50 ? offset + 50 : null }
  }
  if (detail) return ['incidents','responses','writes'].includes(detail) ? eventPage(detail) : recordPage(detail === 'feedback' ? 'pilot_feedback' : 'beta_checklists')
  function timingStats(where, args) {
    return one(`WITH times AS (SELECT duration_ms,ROW_NUMBER() OVER(ORDER BY duration_ms) rn,COUNT(*) OVER() n FROM pilot_events WHERE ${where} AND event='api_response' AND duration_ms BETWEEN 0 AND 120000) SELECT COUNT(*) measured,ROUND(AVG(duration_ms)) avgMs,MIN(CASE WHEN rn>=((n*95+99)/100) THEN duration_ms END) p95Ms,SUM(CASE WHEN duration_ms>${SLOW_MS} THEN 1 ELSE 0 END) slow FROM times`, args)
  }
  const timing = timingStats(selected, values)
  const totals = one(`SELECT COUNT(*) events,COUNT(DISTINCT account_id) accountsWithActivity,COUNT(DISTINCT device_id) devices,
    SUM(CASE WHEN event='api_response' THEN 1 ELSE 0 END) responses,
    SUM(CASE WHEN event='api_response' AND ${status}>=400 THEN 1 ELSE 0 END) failedRequests,
    SUM(CASE WHEN event='api_response' AND ${status}>=500 THEN 1 ELSE 0 END) serverFailures,
    SUM(CASE WHEN event='api_response' AND ${status}=409 THEN 1 ELSE 0 END) conflicts,
    SUM(CASE WHEN event='api_response' AND ${status}>=400 AND json_extract(${metadata},'$.method') IN ('POST','PATCH','DELETE') THEN 1 ELSE 0 END) failedWrites,
    SUM(CASE WHEN event='network_error' THEN 1 ELSE 0 END) networkFailures,
    SUM(CASE WHEN event='client_error' THEN 1 ELSE 0 END) clientErrors,
    SUM(CASE WHEN event='active_time' THEN duration_ms ELSE 0 END) activeMs,
    SUM(CASE WHEN ${version}='unknown' THEN 1 ELSE 0 END) unknownVersionEvents,
    SUM(CASE WHEN json_extract(${metadata},'$.clientRelease') IS NOT NULL AND json_extract(${metadata},'$.clientRelease') NOT IN ('unknown','local') AND json_extract(${metadata},'$.clientRelease')!=${version} THEN 1 ELSE 0 END) versionMismatchEvents
    FROM pilot_events WHERE ${selected}`)
  for (const key of Object.keys(totals)) totals[key] ||= 0
  Object.assign(totals, timing, { slow: timing.slow || 0, incidents: one(incidentCTE + ' SELECT COUNT(*) n FROM ranked WHERE rank=1').n, errorRate: totals.responses ? Math.round(totals.failedRequests / totals.responses * 1000) / 10 : null })
  const accounts = ids.map(id => {
    const a = db.prepare('SELECT first_access_at FROM pilot_accounts WHERE id=?').get(id)
    const pref = db.prepare("SELECT data FROM pilot_records WHERE account_id=? AND collection='account_preferences'").get(id)
    const counts = db.prepare("SELECT COUNT(*) records,SUM(CASE WHEN collection='dogs' THEN 1 ELSE 0 END) pets FROM pilot_records WHERE account_id=? AND collection NOT IN ('account_preferences','beta_checklists')").get(id)
    return { id, label: labels.get(id), firstAccessAt: a?.first_access_at || null, analyticsEnabled: parse(pref?.data).bichu_privacy_analytics !== 'false', records: counts.records, pets: counts.pets || 0 }
  })
  const versionRows = all(`SELECT ${version} release,COUNT(*) events FROM pilot_events WHERE ${base} GROUP BY ${version} ORDER BY MAX(created_at) DESC LIMIT 50`, baseValues)
  const recordVersions = all(`SELECT DISTINCT COALESCE(NULLIF(json_extract(data,'$.release'),''),'unknown') release FROM pilot_records WHERE ${scope} AND collection IN ('pilot_feedback','beta_checklists') AND updated_at>=? AND updated_at<=? LIMIT 50`, [...ids, new Date(from).toISOString(), new Date(now).toISOString()])
  for (const r of recordVersions) if (!versionRows.some(v => v.release === r.release)) versionRows.push({ release: r.release, events: 0 })
  const versions = versionRows.map(v => {
    const where = base + ` AND ${version}=?`, args = [...baseValues, v.release]
    const times = timingStats(where, args)
    const responses = one(`SELECT COUNT(*) n,SUM(CASE WHEN ${status}>=400 THEN 1 ELSE 0 END) failed FROM pilot_events WHERE ${where} AND event='api_response'`, args),failed=responses.failed||0
    const recordArgs=[...ids,new Date(from).toISOString(),new Date(now).toISOString(),v.release]
    const records=one(`SELECT SUM(CASE WHEN collection='pilot_feedback' THEN 1 ELSE 0 END) feedback,SUM(CASE WHEN collection='beta_checklists' THEN 1 ELSE 0 END) checklists FROM pilot_records WHERE ${scope} AND collection IN ('pilot_feedback','beta_checklists') AND updated_at>=? AND updated_at<=? AND COALESCE(NULLIF(json_extract(data,'$.release'),''),'unknown')=?`,recordArgs)
    return { ...v, ...times, slow: times.slow || 0, responses:responses.n, failedRequests: failed, feedback:records.feedback||0,checklists:records.checklists||0,errorRate: responses.n ? Math.round(failed / responses.n * 1000) / 10 : null }
  })
  const routes = all(`SELECT ${route} route,COUNT(*) measured,ROUND(AVG(duration_ms)) avgMs,SUM(CASE WHEN ${status}>=400 THEN 1 ELSE 0 END) failedRequests,SUM(CASE WHEN duration_ms>${SLOW_MS} THEN 1 ELSE 0 END) slow FROM pilot_events WHERE ${selected} AND event='api_response' GROUP BY ${route} ORDER BY failedRequests DESC,avgMs DESC LIMIT 20`).map(r => ({ ...r, route: safeRoute(r.route) }))
  const devices = all(`SELECT account_id,device_id,COUNT(*) events,SUM(CASE WHEN event='active_time' THEN duration_ms ELSE 0 END) activeMs,SUM(CASE WHEN ${failure} THEN 1 ELSE 0 END) errorSignals,MAX(created_at) lastSeen FROM pilot_events WHERE ${selected} AND device_id IS NOT NULL GROUP BY account_id,device_id ORDER BY lastSeen DESC LIMIT 101`).map(r => {
    const device = db.prepare('SELECT data FROM pilot_devices WHERE account_id=? AND device_id=?').get(r.account_id, r.device_id), data = parse(device?.data)
    return { accountId: r.account_id, account: labels.get(r.account_id), deviceId: r.device_id, events: r.events, activeMs: r.activeMs, errorSignals: r.errorSignals, lastSeen: r.lastSeen, browser: data.browser || 'Navegador não informado', screen: data.screen || '—' }
  })
  const dayRows = all(`SELECT strftime('%Y-%m-%d',created_at/1000,'unixepoch','-3 hours') day,COUNT(*) events,SUM(CASE WHEN event='api_response' THEN 1 ELSE 0 END) measured,SUM(CASE WHEN event='api_response' AND ${status}>=400 THEN 1 ELSE 0 END) failedRequests FROM pilot_events WHERE ${selected} GROUP BY day ORDER BY day`)
  const feedback = recordPage('pilot_feedback'), checklists = recordPage('beta_checklists')
  const checklistCounts = one(`SELECT COUNT(*) answered FROM pilot_records WHERE ${scope} AND collection='beta_checklists' AND updated_at>=? AND updated_at<=?` + (selectedRelease === 'all' ? '' : " AND json_extract(data,'$.release')=?"), [...ids, new Date(from).toISOString(), new Date(now).toISOString(), ...(selectedRelease === 'all' ? [] : [selectedRelease])])
  const feedbackCount = one(`SELECT COUNT(*) n FROM pilot_records WHERE ${scope} AND collection='pilot_feedback' AND updated_at>=? AND updated_at<=?` + (selectedRelease === 'all' ? '' : " AND COALESCE(NULLIF(json_extract(data,'$.release'),''),'unknown')=?"), [...ids, new Date(from).toISOString(), new Date(now).toISOString(), ...(selectedRelease === 'all' ? [] : [selectedRelease])]).n
  const failedTasks = one(`SELECT COUNT(*) n FROM pilot_records r,json_each(r.data,'$.steps') s WHERE ${ids.length ? `r.account_id IN (${ids.map(() => '?').join(',')})` : '0=1'} AND r.collection='beta_checklists' AND r.updated_at>=? AND r.updated_at<=? AND json_extract(s.value,'$.status')='failed'` + (selectedRelease === 'all' ? '' : " AND json_extract(r.data,'$.release')=?"), [...ids, new Date(from).toISOString(), new Date(now).toISOString(), ...(selectedRelease === 'all' ? [] : [selectedRelease])]).n
  return { generatedAt: now, environment: env.LAB_KIND || 'matrix', currentRelease: appRelease(env), selectedRelease, window: { days, from, to: now }, slowThresholdMs: SLOW_MS,
    totals: { ...totals, accounts: accounts.length, startedAccounts: accounts.filter(a => a.firstAccessAt).length, pets: accounts.reduce((n,a) => n+a.pets,0), optInAccounts: accounts.filter(a => a.analyticsEnabled).length, feedback: feedbackCount, checklists: checklistCounts.answered, failedTasks },
    accounts, versions, routes, devices:devices.slice(0,100),devicesTruncated:devices.length>100, days: dayRows, writes:eventPage('writes'), incidents: eventPage('incidents'), responses: eventPage('responses'), feedback, checklists,
    coverage: 'Métricas técnicas usam todos os eventos recebidos no período. Tempos são calculados somente com duração válida. Ausência de eventos não comprova ausência de falhas. Tempo ativo por versão começa nesta instrumentação; não redistribuímos tempos antigos. Ocorrências são deduplicadas somente quando existe identificação da requisição. Checklist é declaração manual do participante.' }
}
