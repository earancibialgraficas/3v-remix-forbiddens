import { downloadGameRealSaveFromCloudflare, downloadSaveSlotsFromCloudflare, uploadGameRealSaveToCloudflare, uploadSaveSlotsToCloudflare } from "@/lib/cloudSaveSync";
import { getLauncherBridge } from "@/lib/launcherBridge";

type NativeCloudSaveKind = "savestate" | "real_save";

const retroarchNativeConsoles = new Set(["nes", "snes", "gba", "gbc", "sega", "n64", "arcade", "ps1", "psp", "ps2"]);

export const isNativeCloudSaveSupported = (consoleId: string) =>
  retroarchNativeConsoles.has(consoleId.trim().toLowerCase());

export const getNativeCloudSaveKind = (consoleId: string): NativeCloudSaveKind =>
  ["n64", "ps1", "psp", "ps2"].includes(consoleId.trim().toLowerCase()) ? "real_save" : "savestate";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export async function restoreNativeCloudSave(params: {
  consoleId: string;
  gameName: string;
  romPath?: string | null;
}) {
  const consoleId = params.consoleId.trim().toLowerCase();
  if (!params.romPath || !isNativeCloudSaveSupported(consoleId)) return false;

  const bridge = getLauncherBridge();
  if (!bridge?.writeNativeSaveFile) return false;

  const kind = getNativeCloudSaveKind(consoleId);
  if (kind === "real_save") {
    const realSave = await downloadGameRealSaveFromCloudflare({
      gameName: params.gameName,
      consoleType: consoleId,
    });
    if (!realSave?.data) return false;
    await bridge.writeNativeSaveFile({
      consoleId,
      romPath: params.romPath,
      kind,
      data: realSave.data,
    });
    return true;
  }

  const cloudJson = await downloadSaveSlotsFromCloudflare({
    gameName: params.gameName,
    consoleType: consoleId,
  });
  if (!cloudJson) return false;

  const slots = JSON.parse(cloudJson);
  const newestSlot = Array.isArray(slots) ? slots[0] : null;
  if (!newestSlot?.data) return false;
  await bridge.writeNativeSaveFile({
    consoleId,
    romPath: params.romPath,
    kind,
    data: newestSlot.data,
  });
  return true;
}

export async function syncNativeCloudSave(params: {
  consoleId: string;
  gameName: string;
  romPath?: string | null;
  processId?: number | null;
}) {
  const consoleId = params.consoleId.trim().toLowerCase();
  if (!params.romPath || !isNativeCloudSaveSupported(consoleId)) return false;

  const bridge = getLauncherBridge();
  if (!bridge?.readNativeSaveFile) return false;

  const kind = getNativeCloudSaveKind(consoleId);
  if (kind === "savestate" && params.processId && bridge.nativeEmulatorAction) {
    await bridge.nativeEmulatorAction(params.processId, "save_state");
    await wait(900);
  }

  const payload = await bridge.readNativeSaveFile({
    consoleId,
    romPath: params.romPath,
    kind,
  });
  if (!payload?.data || !payload.size) return false;

  if (kind === "real_save") {
    await uploadGameRealSaveToCloudflare({
      gameName: params.gameName,
      consoleType: consoleId,
      data: payload.data,
      size: payload.size,
    });
    return true;
  }

  await uploadSaveSlotsToCloudflare({
    gameName: params.gameName,
    consoleType: consoleId,
    slotsJson: JSON.stringify([
      {
        name: "Nativo",
        data: payload.data,
        timestamp: Date.now(),
      },
    ]),
  });
  return true;
}
