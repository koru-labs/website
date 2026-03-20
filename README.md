# UCL Docs Site (Nextra + Docker)

This folder contains an isolated Nextra 4 docs site used to serve the repository `docs/` content.

## Run with Docker

From repository root:

```bash
docker compose -f docker-compose.docs.yml up --build -d
```

Open in browser:

- `http://localhost:3000/docs` (redirects to `/docs/intro`)

## Stop

```bash
docker compose -f docker-compose.docs.yml down
```

## Notes

- The container mounts `../docs` as Nextra `content` directory.
- Sidebar order is controlled by `_meta.js` files under `docs/`.
