# Tree API Setup

This API expects these application settings in Azure Static Web Apps:

- `TREE_BLOB_CONNECTION_STRING`
- `TREE_BLOB_CONTAINER` (optional, default: `trees`)

Endpoints:

- `GET /api/trees` -> list tree files
- `POST /api/trees` -> save `{ "name": "mytree.json", "tree": { ... } }`
- `GET /api/trees/{name}` -> load one tree
- `DELETE /api/trees/{name}` -> delete one tree
