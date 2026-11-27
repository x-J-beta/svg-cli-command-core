import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stat } from "node:fs/promises";

export class ModuleResolver {
  async resolve(specifier: string, configPath: string): Promise<string> {
    // Node 20 exposes parent-relative ESM resolution under this flag.
    // Resolve in a child process so import-only package exports use Node's import conditions.
    const script = `try {
      process.stdout.write(JSON.stringify({ url: import.meta.resolve(process.argv[1], process.argv[2]) }));
    } catch (error) { process.stdout.write(JSON.stringify({ code: error.code, message: error.message })); }`;
    const { stdout } = await promisify(execFile)(process.execPath,
      ["--no-warnings", "--experimental-import-meta-resolve", "--input-type=module", "-e", script, specifier, pathToFileURL(configPath).href]);
    const result = JSON.parse(stdout) as { url?: string; code?: string; message?: string };
    if (!result.url) throw Object.assign(new Error(result.message), { code: result.code });
    const path = fileURLToPath(result.url);
    await stat(path);
    return path;
  }
}
