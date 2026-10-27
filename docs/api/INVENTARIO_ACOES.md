# Inventário operacional atual

| Área | Operação e implementação |
| --- | --- |
| Tutor | Sessão em `/api/pilot/me`; login e logout no servidor próprio |
| Meus pets | Registros dogs; peso, saúde e plano vinculados à conta e ao pet |
| Peso | Registros weight_logs, com datas da pesagem e atualização do peso atual |
| Alimentação | feeding_plans, user_foods e natural_diets; confirmação diária em rotina própria |
| Saúde | health_events e pet_routine_events; consultas restritas à conta |
| Personalização | `/api/pilot/preferences`, com resolução de conflitos entre aparelhos |
| Feedback | pilot_feedback e respostas autorizadas; acompanhamento pelo tutor |
| Colaboradores | `/api/team`, atribuições individuais, tarefas e auditoria |
| Proprietário | Dashboard, participantes, registros, alterações e atividade por conta |
| Matriz | Abertura da própria conta piloto 01 e referências criptografadas somente de leitura |
| Beta e sujo | Serviços e bancos separados; 20 reservas beta inativas inicialmente |
| Recuperação | Backup externo criptografado com verificação de restauração |

As regras reais estão em server/ e worker/. Não há permissões públicas herdadas do backend antigo. Catálogos e dados demonstrativos locais não devem ser confundidos com cadastros profissionais verificados ou recursos publicados. BCS permanece inativo; funcionalidades sociais fora do piloto não são anunciadas como parte do MVP.
