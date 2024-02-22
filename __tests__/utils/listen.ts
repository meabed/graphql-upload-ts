import { Server } from 'http';
import { AddressInfo } from 'net';

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
