# Versiones y descargas: revisión de contratos

Fecha: 2026-11-03. El bloqueo inicial se resolvió con autorización explícita del usuario. Los cuatro GET administrativos ya están implementados y probados; la revisión inicial se conserva debajo como evidencia de la necesidad del cambio.

## Evidencia del bloqueo inicial (antes de la ampliación)

Repositorio inspeccionado: `C:/Users/nitro/Documents/programming/spring-boot/nitros-games-backend`. Fuentes Java bajo `src/main/java/com/nitros64/nitros_games_backend/`.

- `game/api/AdminGameController.java`: únicamente lista de juegos, detalle de juego y cambio de publicación. No contiene consultas administrativas de versiones ni descargas. Se ha revisado el inventario de controladores del repositorio.
- `game/application/GameVersionApplicationService.java:35-49`: tanto `findVersions` como `findVersion` invocan `gamePublication.requirePublishedGame(gameId)`.
- `game/application/DownloadLinkApplicationService.java:35-49`: tanto `findDownloadLinks` como `findDownloadLink` aplican la misma restricción.
- `game/application/GameApplicationService.java:72`: `requirePublishedGame` exige existencia con `PublicationStatus.PUBLISHED`; de lo contrario lanza `ResourceNotFoundException`.
- `security/SecurityConfiguration.java`: `/api/v1/admin/**` exige ADMIN; GET público permite acceso sin autenticación. Añadir un bearer ADMIN a una consulta pública no elimina la restricción de publicación aplicada en el servicio.
- Las escrituras de versiones y descargas sí permiten trabajar con juegos existentes DRAFT: resuelven la pertenencia al juego/versión sin exigir publicación. Por tanto, crear y después redirigir a una consulta pública deja al administrador sin poder recuperar el recurso creado.

Conclusión basada en inspección de código, no en una prueba autenticada nueva contra el servicio en ejecución. No se han consultado borradores a través de rutas públicas ni creado datos para esta revisión.

## Contratos existentes

| Recurso | Ruta base | Operaciones |
| --- | --- | --- |
| Versiones | `/api/v1/games/{gameId}/versions` | GET lista publicada, POST creación ADMIN |
| Versión | `/api/v1/games/{gameId}/versions/{versionId}` | GET detalle publicado, PUT y DELETE ADMIN |
| Descargas | `/api/v1/games/{gameId}/versions/{versionId}/download-links` | GET lista publicada, POST creación ADMIN |
| Descarga | `/api/v1/games/{gameId}/versions/{versionId}/download-links/{linkId}` | GET detalle publicado, PUT y DELETE ADMIN |

Las listas son arrays JSON sin envoltorio. POST devuelve 201 y el DTO; PUT devuelve el DTO; DELETE devuelve 204.

`GameVersionRequest`: `name` obligatorio de 4 a 30 caracteres; `programmingLanguageId`, `programmingToolId`, `platformId` y `processorId` obligatorios y positivos. `GameVersionResponse` añade `id` y `gameId`.

`DownloadLinkRequest`: `link` obligatorio de 4 a 100 caracteres; `serverHostImageId` obligatorio y positivo. `DownloadLinkResponse` añade `id` y `gameVersionId`. El nombre del campo es `link`, no `url`; el servidor se selecciona del catálogo existente de server-host-images. El frontend deberá aceptar únicamente URLs HTTP/HTTPS sin credenciales para los enlaces navegables; las anotaciones del DTO solo comprueban longitud y contenido no vacío.

Catálogos GET disponibles:

- `/api/v1/programming-languages`: `{id,name}`.
- `/api/v1/programming-tools`: `{id,name,webPage,imagefilePath,toolTypeId}`.
- `/api/v1/language-tools`: pares `{programmingLanguageId,programmingToolId}`.
- `/api/v1/platforms` y `/api/v1/processors`: `{id,name}`.
- `/api/v1/server-host-images`: `{id,name,imagepath}`.

`tooling/application/ToolCompatibilityService.java` exige que el par lenguaje/herramienta exista en LanguageToolRepository. Plataforma y procesador deben existir; no se ha encontrado otra matriz de compatibilidad en ese servicio. La interfaz debe filtrar herramientas por esos pares y volver a comprobarlos en servidor antes de escribir; Spring Boot sigue siendo la autoridad definitiva.

## Ampliación mínima implementada tras autorización

Se añadieron cuatro consultas administrativas, protegidas por la regla existente `/api/v1/admin/**` que exige ADMIN:

1. GET `/api/v1/admin/games/{gameId}/versions`.
2. GET `/api/v1/admin/games/{gameId}/versions/{versionId}`.
3. GET `/api/v1/admin/games/{gameId}/versions/{versionId}/download-links`.
4. GET `/api/v1/admin/games/{gameId}/versions/{versionId}/download-links/{linkId}`.

Reutilizar los DTO existentes y las consultas de pertenencia actuales. Los métodos administrativos deben aceptar tanto DRAFT como PUBLISHED, devolver 404 para padres inexistentes o jerarquías incorrectas y distinguir lista vacía de recurso inexistente. Mantener `requirePublishedGame` en TODAS las lecturas públicas. No se necesitan nuevas rutas de escritura, migraciones de datos ni cambios de infraestructura para resolver este bloqueo.

Pruebas necesarias del backend: ADMIN puede listar y consultar ambos estados; anónimo recibe 401 y usuario sin ADMIN 403 en las nuevas rutas; las lecturas públicas de DRAFT siguen devolviendo 404; una versión o enlace de otro padre devuelve 404; colecciones existentes sin hijos devuelven `[]`.

## Integración frontend implementada

`src/features/game-releases` agrupa los contratos y decodificadores, las consultas administrativas, las acciones de escritura, los formularios y las vistas administrativa/pública. `src/app` compone las rutas con Suspense y resuelve los parámetros dentro del límite dinámico. Se reutilizan las sesiones opacas, validación de Origin/CSRF, llamadas bearer exclusivamente en servidor, errores HTTP y componentes retro existentes.

- `/admin/{gameId}/versions`: lista de versiones y creación. Accesible desde la ficha del juego.
- `/admin/{gameId}/versions/{versionId}`: edición de versión, lista/creación/edición de descargas y eliminaciones con confirmación escrita. Eliminar una versión también elimina sus enlaces conforme al backend.
- `/games/{gameId}`: versiones y enlaces públicos, accesible desde el catálogo. Confirma PUBLISHED y usa exclusivamente los GET públicos sin tokens. Nunca utiliza consultas administrativas para mostrar datos públicos.

Los formularios conservan los valores cuando hay errores. Cambiar de lenguaje vacía la herramienta y filtra las opciones por los pares del backend. Las acciones vuelven a consultar los catálogos y validan la compatibilidad; las escrituras finales siguen sujetas a Spring Security y a la validación de Spring Boot. IDs, listas, duplicados, pertenencia padre/hijo y URLs se validan en las fronteras. Las descargas solo admiten HTTP/HTTPS sin credenciales; las respuestas inválidas no producen enlaces navegables.

La publicación se comprueba en cada lectura del backend. Una página ya abierta no puede retirar un enlace que el visitante ya recibió; el siguiente acceso o recarga aplica el estado actual. Los enlaces externos no son archivos privados ni descargas mediadas por el frontend.

## Archivos del backend

Bajo `src/main/java/com/nitros64/nitros_games_backend/game/`:

- Nuevos `api/AdminGameVersionController.java` y `api/AdminDownloadLinkController.java`.
- Modificados `application/GameVersionApplicationService.java` y `application/DownloadLinkApplicationService.java`: lecturas administrativas reutilizables; las públicas mantienen `requirePublishedGame`.
- Ampliado `src/test/java/com/nitros64/nitros_games_backend/game/api/GameApiContractTests.java`: DRAFT/PUBLISHED/DRAFT, GET anónimo y sin ADMIN, HEAD anónimo, listas vacías, 400, 404 y pertenencia a otro padre.

No hay nuevas dependencias, migraciones, cambios de infraestructura ni modificaciones a datos reales.

## Verificación

Backend: `./mvnw.cmd verify -Pmysql-it` correcto: 282 pruebas generales y 7 pruebas Testcontainers MySQL, sin fallos, errores ni omitidas. H2 y contenedores aislados; no se ejecutaron pruebas sobre la base de datos real. Registro: `nitros-games-backend/target/admin-children-verification.log`.

Frontend: las pruebas nuevas cubren CRUD sobre DRAFT, compatibilidades manipuladas, CSRF, rechazo de usuarios sin ADMIN, publicación/despublicación, enlaces públicos, URLs inseguras, respuestas inválidas y errores HTTP. Resultados finales: 49/49 pruebas en desarrollo y 25/25 en producción; lint, typecheck y build correctos. Se corrigió durante la verificación el acceso a params fuera de Suspense y se delimitó un selector de test al formulario visible, necesario por las rutas preservadas de Next.js. No quedan fallos en las tandas finales.

No se ha modificado ni eliminado Arcane Drift (ID 1) ni sus versiones o enlaces. No se realizan commits ni push. El usuario reinició Spring Boot con el código actualizado antes de la comprobación manual.

Comprobación pública local: `/games/1` muestra Arcane Drift, Version 0.1, Windows/x64 y el enlace existente de itch.io. Solo lectura; no se siguió ni modificó el enlace. La verificación manual del nuevo CRUD contra Keycloak y Spring Boot locales está completada, como se detalla al final. Queda pendiente únicamente el rechazo con una cuenta real sin ADMIN, aplazado por el usuario; ese escenario sí está cubierto por las pruebas automatizadas.

Inventario frontend: nuevas rutas `src/app/admin/[id]/versions/page.tsx`, `src/app/admin/[id]/versions/[versionId]/page.tsx`, `src/app/games/[id]/page.tsx`; nuevo módulo `src/features/game-releases/{contracts.ts,data.ts,actions.ts,forms.tsx,pages.tsx,public-page.tsx}`; ajustes en `src/features/admin-games/{pages.tsx,data.ts,admin.css}` y `src/features/catalog/catalog.tsx`; pruebas en `tests/admin.spec.ts`, `tests/support/admin-fixture.mjs` y nuevo `tests/support/releases-fixture.mjs`; documentación en README y este informe. No se modificaron las dependencias ni la configuración OIDC.

## Prueba manual con Keycloak y Spring Boot reiniciado

Sesión ADMIN iniciada manualmente por el usuario. Se creó exclusivamente el juego temporal `QA Releases Temporal` (ID 5), la versión ID 3 y el enlace ID 3.

Comprobado: lista de versiones vacía en DRAFT; creación con CSharp/MonoGame, Windows/x64; edición de versión a `QA Version 0.2`; creación y edición de enlace a `https://example.com/qa-releases-v02.zip`; persistencia tras recarga; consulta administrativa de descargas en DRAFT; página pública 404 antes de publicar; versión y URL editada visibles tras publicar; vuelta a 404 tras despublicar. Java no ofreció herramientas porque el catálogo real no contiene pares asociados; no se inventaron compatibilidades. No se siguieron enlaces de descarga de prueba.

Limpieza completada el 4 de noviembre de 2026 con autorización explícita del usuario: eliminados, en este orden, el enlace temporal ID 3, la versión temporal ID 3 y el juego temporal ID 5. Se comprobó en la interfaz la ausencia de enlaces, después de versiones y finalmente del juego; el panel administrativo solo muestra Arcane Drift. La comparación pública posterior conserva todos los campos de Arcane Drift, su versión y su descarga; únicamente varía el orden de `genreIds` (`[7,3]` frente a `[3,7]`), con el mismo conjunto de géneros. Evidencias en `test-results/releases-live-published.png`, `test-results/releases-live-delete-confirmation.png` y `test-results/releases-live-cleaned.png` (ignoradas por Git).
