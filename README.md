# Amaia AI Pump Hunter

Stack serio para monitorizar oportunidades de mercado con narrativa, scoring y alertas.

- `frontend/`: Next.js + Tailwind + login protegido
- `backend/`: FastAPI + cache + escaneo + WebSocket
- mercados soportados: `spot` y `futures` en el dashboard
- narrativas configurables y señales compuestas visibles en UI

## Arquitectura recomendada

Para una version estable y presentable:

- frontend en Vercel
- backend en un servicio Python dedicado

Recomendacion practica:

- `Vercel` para el frontend Next.js
- `Railway`, `Render` o `Fly.io` para el backend FastAPI

Motivo:

- Vercel encaja muy bien con Next.js
- FastAPI se puede desplegar en Vercel, pero su documentacion lo orienta como Function
- el soporte de WebSocket en Vercel Functions no es la via recomendada para este caso

Fuentes oficiales:

- [FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi)
- [WebSocket support guide](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections)

## Credenciales iniciales

- usuario: `amaia-admin`
- password: `AmaiaHunter2026!`

Cambialas con variables de entorno antes de desplegar.

## Variables de entorno

### Frontend

Usa `frontend/.env.example` como base:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8001
NEXT_PUBLIC_WS_URL=
AMAIA_ADMIN_USER=amaia-admin
AMAIA_ADMIN_PASSWORD=AmaiaHunter2026!
```

Notas:

- si `NEXT_PUBLIC_WS_URL` esta vacia, el dashboard funciona en modo `REST only`
- para local, el frontend usa `http://127.0.0.1:8001`
- para produccion, apunta `NEXT_PUBLIC_API_URL` a tu backend publico

### Backend

Usa `backend/.env.example` como base:

```bash
AMAIA_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://your-frontend.vercel.app
AMAIA_BINANCE_FUTURES_KLINES_URL=https://fapi.binance.com/fapi/v1/klines
AMAIA_REDIS_URL=
```

La variable mas importante para produccion es `AMAIA_ALLOWED_ORIGINS`, que debe incluir tu dominio final de Vercel.

## Desarrollo local

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

### Ambos desde la raiz

```bash
cd C:\Users\raphe\OneDrive\Documents\New folder\amaia-ai
npm run app:start
```

Detener:

```bash
npm run app:stop
```

## Despliegue en Vercel

### Frontend

1. Crea un proyecto en Vercel apuntando a la carpeta `frontend/`
2. Framework preset: `Next.js`
3. Build command: automatico
4. Output: automatico
5. Variables de entorno:

```bash
NEXT_PUBLIC_API_URL=https://tu-backend-publico.com
NEXT_PUBLIC_WS_URL=wss://tu-backend-publico.com/ws
AMAIA_ADMIN_USER=tu_usuario
AMAIA_ADMIN_PASSWORD=tu_password_seguro
```

Si tu backend no expone WebSocket en produccion todavia:

```bash
NEXT_PUBLIC_WS_URL=disabled
```

### Backend

Opciones recomendadas:

- Railway
- Render
- Fly.io

Comando de arranque:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Variables minimas:

```bash
AMAIA_ALLOWED_ORIGINS=https://tu-frontend.vercel.app
```

## Estado actual

- login protegido listo
- dashboard premium pulido
- REST listo para `spot` y `futures`
- WebSocket listo para `spot`
- fallback `REST only` listo para `all` y `futures`
- narrativas movidas a config dedicada
- señales visibles tipo `Breakout Build`, `Pressure Coil`, `No Edge`
