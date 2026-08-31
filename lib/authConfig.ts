/**
 * Interrupteur temporaire : désactive l'exigence d'authentification Super Admin sur
 * les routes /api/admin/* et la garde côté client (components/GardeSuperAdmin.tsx),
 * pour permettre un accès direct — sans connexion — aux pages de création (parents,
 * élèves, professeurs, évaluations) et à la page d'accueil.
 *
 * ⚠️ TEMPORAIRE ET DANGEREUX EN PRODUCTION : tant que ce flag vaut `true`, n'importe
 * qui connaissant l'URL peut créer, lire et modifier les comptes parents/élèves/staff
 * et les évaluations. Les règles RTDB (database.rules.json) restent, elles, inchangées
 * et continuent d'exiger une authentification pour les accès directs côté client — ce
 * flag ne désactive que le contrôle d'accès des routes /api/admin/* (qui passent par
 * l'Admin SDK, donc par-dessus ces règles).
 *
 * Pour réactiver l'authentification Super Admin : repasser ce flag à `false`.
 */
export const AUTH_DISABLED = true;
