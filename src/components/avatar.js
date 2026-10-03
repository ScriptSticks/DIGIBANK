import { escapeHTML } from "../core/text.js";
import { isSafePhoto } from "../core/profile-photo.js";

export function avatar(user) {
  // Storage can be edited outside the app, so check the saved value at render time
  // too. Keep initials underneath the image; the error listener in main.js removes
  // a broken image and reveals the fallback without using an inline onerror script.
  const initials = String(user.fullName ?? "").trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
  const photo = isSafePhoto(user.profilePhoto) ? `<img class="avatar-photo" src="${escapeHTML(user.profilePhoto)}" alt="" width="46" height="46">` : "";
  return `<span class="avatar" role="img" aria-label="${escapeHTML(user.fullName)} profile photo"><span aria-hidden="true">${escapeHTML(initials)}</span>${photo}</span>`;
}
