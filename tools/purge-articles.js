const { BlobServiceClient } = require('@azure/storage-blob');

(async () => {
  const CONN = process.env.AZURE_STORAGE_CONNECTION;
  if (!CONN) throw new Error('AZURE_STORAGE_CONNECTION is missing');
  const CONTAINER = 'news';

  const svc = BlobServiceClient.fromConnectionString(CONN);
  const container = svc.getContainerClient(CONTAINER);

  // 1) Delete the container (purges ALL blobs under it)
  try {
    console.log(`Deleting container "${CONTAINER}" ...`);
    await container.delete();
    console.log(`Deleted: ${CONTAINER}`);
  } catch (e) {
    if (e.statusCode === 404) {
      console.log(`Container "${CONTAINER}" did not exist. Continuing.`);
    } else {
      throw e;
    }
  }

  // 2) Recreate empty container so code that writes to it does not fail
  console.log(`Recreating container "${CONTAINER}" ...`);
  await svc.createContainer(CONTAINER);
  console.log(`Recreated: ${CONTAINER}`);

  console.log('Purge complete. Nothing remains in "news".');
})();
