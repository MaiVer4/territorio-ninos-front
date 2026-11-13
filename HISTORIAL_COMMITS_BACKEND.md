# Historial Completo de Commits — Backend (Territrio-De-Ninos)

**Total de commits**: 132

| # | Commit | Autor | Día y Fecha | Mensaje |
| :--- | :--- | :--- | :--- | :--- |
| 132 | `e54d3ee` | **MaiVer4** | Miércoles, 11 de noviembre de 2026 20:25:13 | `fix(shift): harden blind shift closure and implement cash drawer arqueo` |
| 131 | `e637e9e` | **MaiVer4** | Miércoles, 11 de noviembre de 2026 20:24:58 | `fix(pos): aggregate attraction capacity and restrict cashier manual discounts` |
| 130 | `490ac4b` | **MaiVer4** | Miércoles, 11 de noviembre de 2026 20:24:45 | `fix(security): prevent cross-tenant minor reparenting and sanitize csv formulas` |
| 129 | `a537b97` | **MaiVer4** | Miércoles, 11 de noviembre de 2026 20:24:28 | `fix(websocket): enforce authentication on connect and destination access control` |
| 128 | `7d98a58` | **MaiVer4** | Martes, 10 de noviembre de 2026 23:10:22 | `refactor(service): centralize authenticated user resolution and lock session start` |
| 127 | `7f8360e` | **MaiVer4** | Martes, 10 de noviembre de 2026 23:10:22 | `perf(persistence): add pessimistic locks and batch queries for tickets and UUIDs` |
| 126 | `77eaf0a` | **MaiVer4** | Martes, 10 de noviembre de 2026 23:10:22 | `fix(security): authenticate STOMP channels, sanitize export errors and bound client IP` |
| 125 | `09de201` | **MaiVer4** | Lunes, 9 de noviembre de 2026 19:35:54 | `refactor(core): remove unused dependencies, wildcard imports and duplicate logic` |
| 124 | `e6e78cf` | **MaiVer4** | Lunes, 9 de noviembre de 2026 19:35:54 | `perf(service): optimize entity lookups and preserve QR audit logs on failure` |
| 123 | `cebbdb8` | **MaiVer4** | Lunes, 9 de noviembre de 2026 19:35:54 | `fix(security): harden container runtime, login cache eviction and CSV export` |
| 122 | `48f13d0` | **MaiVer4** | Lunes, 2 de noviembre de 2026 17:57:46 | `feat(reportes): implement shift reconciliation, ticket audit and OpenPDF/CSV exports` |
| 121 | `cb393ce` | **MaiVer4** | Lunes, 2 de noviembre de 2026 17:57:38 | `feat(operacion): implement station control, qr validation and real-time game sessions` |
| 120 | `6a045ef` | **MaiVer4** | Lunes, 2 de noviembre de 2026 17:57:14 | `feat(tickets): add reprint audit tracking with justification log` |
| 119 | `9455234` | **MaiVer4** | Lunes, 2 de noviembre de 2026 13:57:52 | `feat(tickets): add ESC/POS thermal ticket formatting and print payload endpoint` |
| 118 | `baae65f` | **MaiVer4** | Lunes, 2 de noviembre de 2026 13:02:37 | `feat(caja): expose POST /api/turnos/{id}/arqueo for cashier cash drawer balance verification` |
| 117 | `50bd5a2` | **MaiVer4** | Domingo, 1 de noviembre de 2026 22:57:43 | `fix(db): preserve V4 Flyway checksum and introduce V6 migration for venta congelada` |
| 116 | `e0203e9` | **MaiVer4** | Domingo, 1 de noviembre de 2026 22:41:26 | `fix(ventas): fix real-time aforo, cashier shift access, and ddl defaults` |
| 115 | `d862e26` | **MaiVer4** | Domingo, 1 de noviembre de 2026 21:47:50 | `feat(tickets): implement in-memory qr code generation and endpoints` |
| 114 | `94c1459` | **MaiVer4** | Domingo, 1 de noviembre de 2026 21:14:52 | `feat(tickets): implement uuid ticket generation and sale immutability` |
| 113 | `90a148a` | **MaiVer4** | Jueves, 29 de octubre de 2026 16:59:25 | `chore(repo): update .gitignore to exclude ai agents, secrets, and untrack cached agent files` |
| 112 | `733ac59` | **MaiVer4** | Jueves, 29 de octubre de 2026 13:22:14 | `feat(ventas): implement transactional sales processing, DB migrations, and security hardening` |
| 111 | `67e414b` | **MaiVer4** | Jueves, 29 de octubre de 2026 12:45:48 | `feat(ventas): implement sale and sale items entity, repository, and processing DTOs` |
| 110 | `6ed86b0` | **MaiVer4** | Jueves, 29 de octubre de 2026 12:12:09 | `feat(ventas): implement quotation calculation and dynamic taxes endpoint (CA-04)` |
| 109 | `8307b35` | **MaiVer4** | Martes, 27 de octubre de 2026 14:16:49 | `feat(ventas): implement capacity limit and pricing anti-tampering validation` |
| 108 | `1f252eb` | **MaiVer4** | Martes, 27 de octubre de 2026 13:03:28 | `feat(ventas): implement sales attractions catalog endpoint and live capacity (CA-01)` |
| 107 | `5b0e000` | **MaiVer4** | Domingo, 25 de octubre de 2026 21:11:42 | `refactor(api): extract OpenAPI interfaces and clean up service logic (P2)` |
| 106 | `ad7a03b` | **MaiVer4** | Domingo, 25 de octubre de 2026 21:10:59 | `perf(persistence): optimize queries with EntityGraph and add DB constraints (P1)` |
| 105 | `4f08cd8` | **MaiVer4** | Domingo, 25 de octubre de 2026 21:10:39 | `fix(security): resolve critical security and transactional issues (P0)` |
| 104 | `59c6518` | **MaiVer4** | Viernes, 23 de octubre de 2026 15:24:24 | `test(clientes): add MockMvc and unit test suites for minor age and multi-minor linkage (CA-03, CA-04)` |
| 103 | `2c6258f` | **MaiVer4** | Viernes, 23 de octubre de 2026 15:24:14 | `feat(clientes): enforce minor age rule (1-17) and multiple minors linkage to guardian (CA-03, CA-04)` |
| 102 | `02b4759` | **MaiVer4** | Jueves, 22 de octubre de 2026 16:24:05 | `feat(caja): implement shift history endpoint and permit error dispatch in security` |
| 101 | `dfe7796` | **MaiVer4** | Jueves, 22 de octubre de 2026 15:47:12 | `perf(usuarios): resolve N+1 query in findAll using entity graph for rol` |
| 100 | `e75ce06` | **MaiVer4** | Jueves, 22 de octubre de 2026 14:59:40 | `fix(usuarios): block deletion of users with cash shifts and harden jwt filter path matching` |
| 99 | `c58b566` | **MaiVer4** | Jueves, 22 de octubre de 2026 14:58:30 | `fix(caja): add totalRecaudado json alias and enforce single active shift constraint` |
| 98 | `5a18b57` | **MaiVer4** | Jueves, 22 de octubre de 2026 14:57:24 | `feat(clientes): add document lookup alias, update endpoint and dto compatibility` |
| 97 | `1d3aecf` | **MaiVer4** | Jueves, 22 de octubre de 2026 13:28:33 | `docs(readme): overhaul documentation with architecture, modules, api matrix and setup guides` |
| 96 | `24e94dd` | **MaiVer4** | Jueves, 22 de octubre de 2026 13:28:17 | `feat(clientes): implement client and minor registration with validation and tests` |
| 95 | `8f5310f` | **MaiVer4** | Miércoles, 21 de octubre de 2026 14:31:33 | `feat(caja): implement shift management service, api endpoints and tests` |
| 94 | `4df924f` | **MaiVer4** | Martes, 20 de octubre de 2026 16:44:10 | `feat(caja): add TurnoCaja entity, EstadoTurnoCaja enum, and repository query` |
| 93 | `a971e71` | **MaiVer4** | Miércoles, 14 de octubre de 2026 21:33:26 | `feat(db): integrate flyway for automated schema migrations` |
| 92 | `8d24caf` | **MaiVer4** | Miércoles, 14 de octubre de 2026 19:55:14 | `feat(asignaciones): add frontend compatibility aliases, forced reassignment, and delete endpoint` |
| 91 | `7a65359` | **MaiVer4** | Miércoles, 14 de octubre de 2026 19:55:02 | `fix(security): bypass jwt filter for public auth and docs endpoints` |
| 90 | `017f5b0` | **MaiVer4** | Miércoles, 14 de octubre de 2026 16:24:42 | `chore(db): add hardening migration script for ticket legal column and unique index` |
| 89 | `8d38fc1` | **MaiVer4** | Miércoles, 14 de octubre de 2026 16:24:33 | `feat(auth): implement jwt revocation blacklist on logout and harden auth filter` |
| 88 | `80aa23a` | **MaiVer4** | Miércoles, 14 de octubre de 2026 16:24:19 | `fix(usuarios): protect last active admin and block physical deletion on users with history` |
| 87 | `b9e8cea` | **MaiVer4** | Miércoles, 14 de octubre de 2026 16:24:05 | `fix(atracciones): prevent inactivating attractions with active operator assignments` |
| 86 | `5e1f04e` | **MaiVer4** | Miércoles, 14 de octubre de 2026 16:23:50 | `fix(exceptions): map data integrity violation exceptions to 409 conflict` |
| 85 | `73d0e48` | **MaiVer4** | Miércoles, 14 de octubre de 2026 16:23:41 | `chore(config): require jwt secret env var and externalize ddl-auto and show-sql` |
| 84 | `3f2345e` | **MaiVer4** | Miércoles, 14 de octubre de 2026 16:23:32 | `feat(config): expand ticket legal field and add size and paper width validations` |
| 83 | `86085fc` | **MaiVer4** | Martes, 13 de octubre de 2026 19:57:41 | `chore(db): add legacy description cleanup query to age migration script` |
| 82 | `bed4d48` | **MaiVer4** | Martes, 13 de octubre de 2026 19:50:58 | `refactor(atracciones): remove age range fields from entity, dtos and service` |
| 81 | `c3c3040` | **MaiVer4** | Viernes, 9 de octubre de 2026 17:16:22 | `feat(auth): store sha-256 token hash in db and schedule expired token purge` |
| 80 | `0783465` | **MaiVer4** | Viernes, 9 de octubre de 2026 17:16:14 | `feat(exceptions): handle malformed json and type mismatch exceptions in global handler` |
| 79 | `2605905` | **MaiVer4** | Viernes, 9 de octubre de 2026 17:16:07 | `refactor(models): replace @Data with @Getter and @Setter in entities and test models` |
| 78 | `1c54a75` | **MaiVer4** | Viernes, 9 de octubre de 2026 17:16:00 | `refactor(users): extract openapi swagger contract into UsuarioApi interface` |
| 77 | `7609556` | **MaiVer4** | Viernes, 9 de octubre de 2026 17:15:54 | `refactor(security): remove redundant public api matcher from security config` |
| 76 | `23e9f79` | **MaiVer4** | Viernes, 9 de octubre de 2026 16:49:30 | `test(operaciones): add mockmvc tests for operator assignments and rates` |
| 75 | `3965eb3` | **MaiVer4** | Viernes, 9 de octubre de 2026 16:49:23 | `test(atracciones): add mockmvc tests for attraction and park controllers` |
| 74 | `266ad7a` | **MaiVer4** | Viernes, 9 de octubre de 2026 16:49:12 | `test(auth): add mockmvc tests for auth and user controllers` |
| 73 | `a1fa02d` | **MaiVer4** | Viernes, 9 de octubre de 2026 16:49:04 | `test(config): add unit tests for park configuration service` |
| 72 | `ae9c845` | **MaiVer4** | Viernes, 9 de octubre de 2026 16:48:58 | `test(security): add unit tests for login attempt lockout service` |
| 71 | `f5ea0db` | **MaiVer4** | Viernes, 9 de octubre de 2026 16:48:44 | `docs(agents): add specialized backend agent guidelines` |
| 70 | `cbd51af` | **MaiVer4** | Jueves, 8 de octubre de 2026 16:07:29 | `feat(users): restrict role and status modification to administrators and add tests` |
| 69 | `c353a3f` | **MaiVer4** | Jueves, 8 de octubre de 2026 16:07:18 | `refactor(services): extract common query, validation and builder helpers` |
| 68 | `2a3f262` | **MaiVer4** | Jueves, 8 de octubre de 2026 16:07:07 | `refactor(atracciones): replace lombok @Data with @Getter and @Setter in entity` |
| 67 | `4aa22bf` | **MaiVer4** | Jueves, 8 de octubre de 2026 16:07:02 | `perf(database): eliminate n+1 query overhead using entity graphs` |
| 66 | `80a7bf1` | **MaiVer4** | Jueves, 8 de octubre de 2026 16:06:56 | `feat(security): enable scheduled cache eviction in login attempt service` |
| 65 | `0fb40ce` | **MaiVer4** | Jueves, 8 de octubre de 2026 16:06:51 | `perf(security): optimize jwt claim parsing and filter allocations` |
| 64 | `39fcf1e` | **MaiVer4** | Jueves, 8 de octubre de 2026 16:06:45 | `build(deps): pin lombok annotation processor version and clean up default config` |
| 63 | `e2eb4f9` | **MaiVer4** | Miércoles, 7 de octubre de 2026 16:06:34 | `feat(tarifas): implement event-based pricing tier management` |
| 62 | `013de31` | **MaiVer4** | Miércoles, 7 de octubre de 2026 16:06:26 | `feat(tarifas): implement time-based pricing tier management` |
| 61 | `416ab1c` | **MaiVer4** | Miércoles, 7 de octubre de 2026 16:06:17 | `feat(asignaciones): implement operator attraction assignment management` |
| 60 | `d4d067c` | **MaiVer4** | Miércoles, 7 de octubre de 2026 16:05:42 | `feat(atracciones): add age range constraints, enum deserialization, and controller tests` |
| 59 | `fc14dad` | **MaiVer4** | Miércoles, 7 de octubre de 2026 16:05:32 | `feat(users): add user activation endpoint, role filter and update support` |
| 58 | `797f82d` | **MaiVer4** | Miércoles, 7 de octubre de 2026 16:05:24 | `feat(exceptions): handle IllegalArgumentException as bad request in global handler` |
| 57 | `6a075d9` | **MaiVer4** | Miércoles, 7 de octubre de 2026 16:05:07 | `ci(docker): add multi-stage build Dockerfile` |
| 56 | `a2c78f5` | **MaiVer4** | Martes, 6 de octubre de 2026 18:42:06 | `fix(usuario): keep inactive users in query results and add physical delete endpoint` |
| 55 | `e13be4c` | **MaiVer4** | Lunes, 5 de octubre de 2026 23:29:53 | `chore(config): restore default jwt secret fallback for local development` |
| 54 | `e8d1967` | **MaiVer4** | Lunes, 5 de octubre de 2026 23:29:49 | `feat(configuracion-parque): implement park configuration management module` |
| 53 | `8bf5af4` | **MaiVer4** | Lunes, 5 de octubre de 2026 23:29:39 | `feat(atracciones): add attraction types and operational parameters` |
| 52 | `1b6a2a2` | **MaiVer4** | Lunes, 5 de octubre de 2026 23:29:32 | `feat(auth): implement brute force lockout and account status check` |
| 51 | `52e377a` | **MaiVer4** | Lunes, 5 de octubre de 2026 23:29:26 | `fix(auth): execute bulk delete query for password reset tokens` |
| 50 | `1462b85` | **MaiVer4** | Lunes, 5 de octubre de 2026 23:29:22 | `refactor(auth): add json aliases for password and role fields` |
| 49 | `6b76fd3` | **MaiVer4** | Lunes, 5 de octubre de 2026 23:29:18 | `docs(database): add entity relationship diagrams in drawio format` |
| 48 | `7fbfc31` | **MaiVer4** | Lunes, 5 de octubre de 2026 23:29:14 | `build(deps): add dependencies for qr, websocket, pdf, and csv` |
| 47 | `0d384eb` | **MaiVer4** | Lunes, 28 de septiembre de 2026 18:46:47 | `chore(seguridad): elimina secreto jwt hardcodeado como fallback` |
| 46 | `4149456` | **MaiVer4** | Lunes, 28 de septiembre de 2026 18:44:37 | `feat(auth): ajusta claims jwt, dto de auth y agrega endpoint logout` |
| 45 | `865cf7b` | **MaiVer4** | Lunes, 28 de septiembre de 2026 18:09:33 | `fix(seguridad): resuelve vulnerabilidades idor e inyeccion json` |
| 44 | `c55d43a` | **MaiVer4** | Sábado, 5 de septiembre de 2026 22:32:37 | `refactor(security): optimize CORS policy, JWT filter and DI` |
| 43 | `582739b` | **MaiVer4** | Viernes, 4 de septiembre de 2026 20:17:12 | `test(admin): add unit tests for AtraccionService` |
| 42 | `dba003a` | **MaiVer4** | Viernes, 4 de septiembre de 2026 20:11:11 | `feat(admin): add Atraccion REST controller` |
| 41 | `3d214f8` | **MaiVer4** | Viernes, 4 de septiembre de 2026 20:11:05 | `feat(admin): add Atraccion repository and service layer` |
| 40 | `a71d7eb` | **MaiVer4** | Viernes, 4 de septiembre de 2026 20:10:59 | `feat(admin): add Atraccion entity and DTOs` |
| 39 | `55507e9` | **MaiVer4** | Viernes, 4 de septiembre de 2026 18:32:19 | `feat(exceptions): create structured validation error response` |
| 38 | `b408f0a` | **MaiVer4** | Viernes, 4 de septiembre de 2026 18:31:29 | `refactor(user-service): replace manual DI with @RequiredArgsConstructor` |
| 37 | `ffceaea` | **MaiVer4** | Viernes, 4 de septiembre de 2026 18:30:06 | `refactor(auth-service): replace manual DI with @RequiredArgsConstructor` |
| 36 | `041d34d` | **MaiVer4** | Viernes, 4 de septiembre de 2026 18:29:08 | `refactor(api): extract swagger annotations to AuthApi interface` |
| 35 | `839f657` | **MaiVer4** | Martes, 1 de septiembre de 2026 16:37:36 | `fix(config): revert server port to 8080` |
| 34 | `059abb4` | **MaiVer4** | Martes, 1 de septiembre de 2026 15:31:40 | `docs(api): completa y actualiza especificacion OpenAPI/Swagger` |
| 33 | `96ff8b4` | **MaiVer4** | Domingo, 30 de agosto de 2026 16:44:08 | `chore(agente): importa skill de conventional commits` |
| 32 | `f31b2d8` | **MaiVer4** | Domingo, 30 de agosto de 2026 16:44:08 | `refactor(api): protege endpoints y estandariza json responses` |
| 31 | `5347e9a` | **MaiVer4** | Domingo, 30 de agosto de 2026 16:44:08 | `fix(auth): previene npe en login y limpia contexto de persistencia` |
| 30 | `802efd6` | **MaiVer4** | Domingo, 30 de agosto de 2026 16:44:08 | `feat(auth): aisla gestion de contraseñas y aplica politicas seguras` |
| 29 | `ef33679` | **MaiVer4** | Domingo, 30 de agosto de 2026 16:44:08 | `test(jwt): agrega pruebas unitarias para validacion de tokens` |
| 28 | `2f8cdb8` | **MaiVer4** | Domingo, 30 de agosto de 2026 16:44:08 | `refactor(excepciones): formatea validaciones como mapa json` |
| 27 | `39832f5` | **MaiVer4** | Domingo, 30 de agosto de 2026 16:44:08 | `perf(bd): cambia fetch a lazy para evitar queries N+1` |
| 26 | `1368fc8` | **MaiVer4** | Viernes, 28 de agosto de 2026 21:49:27 | `chore: agregar scripts de utilidad para despliegue e insercion` |
| 25 | `1fa76ca` | **MaiVer4** | Viernes, 28 de agosto de 2026 21:46:27 | `docs(swagger): mejorar documentación del flujo de recuperación de contraseña en AuthController` |
| 24 | `a024c6a` | **MaiVer4** | Viernes, 28 de agosto de 2026 20:30:19 | `fix(swagger): actualizar springdoc-openapi de 2.6.0 a 3.1.0 para compatibilidad con Spring Boot 4.x` |
| 23 | `0f8e09e` | **MaiVer4** | Viernes, 28 de agosto de 2026 20:25:46 | `test(service): agregar tests unitarios exhaustivos para UsuarioServiceImpl` |
| 22 | `efbd6ab` | **MaiVer4** | Viernes, 28 de agosto de 2026 20:25:38 | `test(service): agregar tests unitarios para EmailServiceImpl` |
| 21 | `04ccdf5` | **MaiVer4** | Viernes, 28 de agosto de 2026 20:25:32 | `test(service): refactorizar AuthServiceTest para nueva arquitectura desacoplada` |
| 20 | `224f03e` | **MaiVer4** | Viernes, 28 de agosto de 2026 20:25:24 | `feat(config): agregar propiedad app.frontend.url configurable por entorno` |
| 19 | `ed4b8a0` | **MaiVer4** | Viernes, 28 de agosto de 2026 20:25:17 | `refactor(service): agregar @Slf4j a UsuarioServiceImpl para trazabilidad` |
| 18 | `8694034` | **MaiVer4** | Viernes, 28 de agosto de 2026 20:25:04 | `refactor(service): refactorizar AuthServiceImpl aplicando SOLID y buenas prácticas` |
| 17 | `5ff2d20` | **MaiVer4** | Viernes, 28 de agosto de 2026 20:24:15 | `feat(service): crear EmailService para desacoplar envío de correos de AuthService` |
| 16 | `a293240` | **MaiVer4** | Viernes, 28 de agosto de 2026 15:42:58 | `feat: Implementar recuperacion de contrasena (CU-03 y CU-04)` |
| 15 | `c36510a` | **MaiVer4** | Jueves, 13 de agosto de 2026 23:47:00 | `chore: agregar configuración de agente e integración de Postman` |
| 14 | `076e974` | **MaiVer4** | Jueves, 13 de agosto de 2026 23:46:27 | `fix(exception): delimitar @RestControllerAdvice a los controladores del proyecto` |
| 13 | `15727b0` | **MaiVer4** | Jueves, 13 de agosto de 2026 23:46:17 | `fix(swagger): permitir acceso público a endpoints de Swagger y actualizar versión a springdoc 2.6.0` |
| 12 | `7768f72` | **MaiVer4** | Miércoles, 22 de julio de 2026 20:28:25 | `docs: actualizar documentación README y README_CONFIG con variables de entorno y Postman` |
| 11 | `12557dd` | **MaiVer4** | Miércoles, 22 de julio de 2026 19:55:03 | `docs(swagger): agregar documentación OpenAPI y clase principal` |
| 10 | `db9e6fd` | **MaiVer4** | Miércoles, 22 de julio de 2026 19:54:52 | `feat(controller): exponer endpoints REST para Auth y Usuarios` |
| 9 | `fbea237` | **MaiVer4** | Miércoles, 22 de julio de 2026 19:54:31 | `feat(service): implementar servicios de autenticación y gestión de usuarios` |
| 8 | `f819231` | **MaiVer4** | Miércoles, 22 de julio de 2026 19:54:25 | `feat(security): implementar utilidades JWT modernas y filtros de seguridad` |
| 7 | `52c7eb8` | **MaiVer4** | Miércoles, 22 de julio de 2026 19:54:18 | `feat(exception): implementar controlador y respuestas globales de error` |
| 6 | `f3f36de` | **MaiVer4** | Miércoles, 22 de julio de 2026 19:54:11 | `feat(mapper): implementar UsuarioMapper para conversión DTO/Entidad` |
| 5 | `7bdb01e` | **MaiVer4** | Miércoles, 22 de julio de 2026 19:54:07 | `feat(repository): crear repositorios Spring Data JPA para Rol y Usuario` |
| 4 | `59470bd` | **MaiVer4** | Miércoles, 22 de julio de 2026 19:54:00 | `feat(dto): agregar DTOs con validaciones y soporte Lombok` |
| 3 | `19484bc` | **MaiVer4** | Miércoles, 22 de julio de 2026 19:53:55 | `feat(domain): definir entidades JPA (Usuario, Rol) y enums con auditoría` |
| 2 | `82babe7` | **MaiVer4** | Miércoles, 22 de julio de 2026 19:49:30 | `feat(config): agregar configuraciones de base de datos y propiedades de la app` |
| 1 | `78879e1` | **MaiVer4** | Miércoles, 22 de julio de 2026 19:49:18 | `chore(setup): inicializar proyecto Spring Boot 4, pom.xml y estructura base` |
