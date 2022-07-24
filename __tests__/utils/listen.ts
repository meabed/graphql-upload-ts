export function listen(app): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(function (error) {
      if (error) reject(error);
      else
        resolve({
          port: server.address().port,
          close: () => server.close(),
        });
    });
  });
}
