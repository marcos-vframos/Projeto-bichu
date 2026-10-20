import { $, privateAccess, show } from './shared.js'
import { createAuditView } from './audit-view.js'
const view = createAuditView($('#audit-container'), () => !$('#audit-container').hidden)
$('#refresh-audit').onclick = () => view.load()
try {
  const me = await privateAccess()
  if (me.role !== 'owner') throw Error('Registros exclusivos do proprietário.')
  $('#audit-container').hidden = false
  await view.start()
  show('')
} catch (error) {
  $('#audit-container').hidden = true
  show(error.message)
}
