export function isUploadcareCdnUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isOfficialHost =
      hostname.endsWith(".ucarecd.net") ||
      hostname === "ucarecd.net" ||
      hostname.endsWith(".ucarecdn.com") ||
      hostname === "ucarecdn.com";

    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      isOfficialHost
    );
  } catch {
    return false;
  }
}
