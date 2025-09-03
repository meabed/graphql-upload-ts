import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export async function listen(server: Server) {
  await new Promise((resolve) => {
    server.listen(resolve);
  });

  const address = server.address() as AddressInfo;
  return {
    port: address.port,
    close: () => server.close(),
  };
}
