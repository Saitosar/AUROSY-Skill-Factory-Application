import loadMujocoModule from "@mujoco/mujoco";
import mujocoWasmUrl from "@mujoco/mujoco/mujoco.wasm?url";
import { MENAGERIE_G1_VFS_PATHS } from "./menagerieAssetPaths";
import { patchMujocoXmlForBrowserCompile } from "./menagerieXmlPatch";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MujocoModule = any;

let mujocoSingleton: Promise<MujocoModule> | null = null;

export function getMujocoModule(): Promise<MujocoModule> {
  if (!mujocoSingleton) {
    mujocoSingleton = loadMujocoModule({
      locateFile: (file: string) => (file.endsWith(".wasm") ? mujocoWasmUrl : file),
    });
  }
  return mujocoSingleton;
}

function menagerieBaseUrl(): string {
  const b = import.meta.env.BASE_URL;
  const root = b.endsWith("/") ? b.slice(0, -1) : b;
  return `${root}/mujoco/g1`;
}

export type MenagerieG1Handles = {
  mujoco: MujocoModule;
  model: InstanceType<MujocoModule["MjModel"]>;
  data: InstanceType<MujocoModule["MjData"]>;
  vfs: InstanceType<MujocoModule["MjVFS"]>;
  /** Call on unmount to free WASM handles */
  dispose: () => void;
};

/**
 * Loads menagerie `scene.xml` from `public/mujoco/g1/` (run `npm run fetch:menagerie-g1`).
 */
export async function loadMenagerieG1(): Promise<MenagerieG1Handles> {
  const mujoco = await getMujocoModule();
  const vfs = new mujoco.MjVFS();

  // Fetch all assets + scene.xml in parallel
  const base = menagerieBaseUrl();
  const assetPromises = MENAGERIE_G1_VFS_PATHS.map(async (rel) => {
    const url = `${base}/${rel}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `Menagerie asset missing (${res.status}): ${url}. Run: npm run fetch:menagerie-g1`
      );
    }
    let buf = new Uint8Array(await res.arrayBuffer());
    if (rel.endsWith(".xml")) {
      const text = new TextDecoder().decode(buf);
      buf = new TextEncoder().encode(patchMujocoXmlForBrowserCompile(text));
    }
    return { rel, buf };
  });

  const scenePromise = fetch(`${base}/scene.xml`).then(async (res) => {
    if (!res.ok) {
      throw new Error(`scene.xml missing. Run: npm run fetch:menagerie-g1`);
    }
    return res.text();
  });

  const [assets, sceneRaw] = await Promise.all([
    Promise.all(assetPromises),
    scenePromise,
  ]);

  for (const { rel, buf } of assets) {
    vfs.addBuffer(rel, buf);
  }

  const sceneXml = patchMujocoXmlForBrowserCompile(sceneRaw);

  const model = mujoco.MjModel.from_xml_string(sceneXml, vfs);
  const data = new mujoco.MjData(model);
  mujoco.mj_forward(model, data);

  const dispose = () => {
    try {
      data.delete();
    } catch {
      /* ignore */
    }
    try {
      model.delete();
    } catch {
      /* ignore */
    }
    try {
      vfs.delete?.();
    } catch {
      /* ignore */
    }
  };

  return { mujoco, model, data, vfs, dispose };
}
