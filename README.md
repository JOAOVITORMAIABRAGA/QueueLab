# QueueLab

Um simulador visual e experimental de filas de pessoas — não de processos.

> Porque até filas de supermercado podem virar experimento.

## Ideia do experimento

O MVP compara duas organizações físicas:

- **Fila única:** todos aguardam na mesma fila e a próxima pessoa entra no primeiro caixa livre.
- **Várias filas:** cada caixa possui sua própria fila. A pessoa escolhe uma fila e permanece nela.

O modo controlado usa a mesma seed para compartilhar chegadas, tempos de atendimento e contratempos entre os cenários. Assim, a organização da fila é a variável principal.

Para várias filas, o MVP oferece duas decisões realistas de escolha: **menor fila** e **aleatória**. Round-robin foi removido porque não representa uma pessoa escolhendo fisicamente uma fila de supermercado.

## Animação

A API calcula o experimento inteiro como eventos discretos. O React recebe esses eventos e os reproduz em velocidade acelerada, mostrando pessoas esperando, caixas ocupados/livres e o cliente em atendimento.

## Estrutura

- `Backend/QueueLab.Api` — REST + Swagger.
- `Backend/QueueLab.Application` — motor de simulação.
- `Backend/QueueLab.Domain` — modelos do domínio.
- `Backend/QueueLab.Tests` — testes do motor.
- `Frontend` — React + TypeScript + Vite + Recharts.

## Execução

### Backend

```bash
cd Backend
dotnet restore
dotnet run --project QueueLab.Api
```

A configuração local do projeto usa `http://localhost:54873` e `https://localhost:54872`.

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Para outra API, defina `VITE_API_URL` em `.env.local`.

## Deploy

- Frontend: Vercel, usando `VITE_API_URL`.
- Backend: Render, usando `CORS_ORIGINS`.

## Por que eu fiz isso?

O QueueLab nasceu como um experimento visual para mostrar, de forma engraçadinha, por que a organização física de uma fila muda o comportamento de um sistema real.

## V2 possível

Falhas de caixa com indisponibilidade temporária, múltiplas rodadas de experimento, distribuição de chegada configurável, métricas de dispersão e uma animação mais rica podem ser adicionadas sem transformar o projeto em uma arquitetura gigantesca.
