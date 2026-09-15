import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const browserAssetsDirectory = join(process.cwd(), ".next", "static");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!serviceRoleKey) {
  process.stderr.write(
    "Client bundle scan requires SUPABASE_SERVICE_ROLE_KEY; its value was not printed.\n",
  );
  process.exitCode = 1;
} else {
  const pendingDirectories = [browserAssetsDirectory];
  let exposed = false;

  while (pendingDirectories.length > 0 && !exposed) {
    const directory = pendingDirectories.pop();
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        pendingDirectories.push(path);
        continue;
      }
      const contents = await readFile(path);
      if (contents.includes(Buffer.from(serviceRoleKey))) {
        exposed = true;
        break;
      }
    }
  }

  if (exposed) {
    process.stderr.write(
      "Security validation failed: a server-only secret was found in browser assets.\n",
    );
    process.exitCode = 1;
  } else {
    process.stdout.write(
      "Client bundle secret scan passed (secret value hidden).\n",
    );
  }
}
