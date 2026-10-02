import { escapeHTML } from "../core/text.js";
import { isSafePhoto } from "../core/profile-photo.js";

export function avatar(user) {
  const initials = String(user.fullName ?? "").trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
  const photo = isSafePhoto(user.profilePhoto) ? `<img class="avatar-photo" src="${escapeHTML(user.profilePhoto)}" alt="" width="46" height="46">` : "";
  return `<span class="avatar" role="img" aria-label="${escapeHTML(user.fullName)} profile photo"><span aria-hidden="true">${escapeHTML(initials)}</span>${photo}</span>`;
}
