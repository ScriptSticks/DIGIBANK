import { avatar } from "./avatar.js";
import { icon } from "./icons.js";
import { isSafePhoto } from "../core/profile-photo.js";

// The edit button sits outside the clipped avatar, so its edge and popup stay visible.
// This component is used on Profile only; the dashboard keeps a read-only avatar.
export function editableAvatar(user) {
  return `<div class="avatar-editor">
    ${avatar(user)}
    <button class="avatar-edit" id="edit-profile-photo" type="button" data-action="toggle-photo-options" aria-label="Edit profile photo" title="Edit profile photo" aria-expanded="false" aria-controls="photo-options">${icon("edit")}</button>
    <div class="photo-options" id="photo-options" role="group" aria-label="Choose photo source" hidden>
      <button class="side-link" type="button" data-action="choose-photo-file">${icon("upload")}<span>Upload from computer</span></button>
      <button class="side-link" type="button" data-action="choose-photo-url">${icon("link")}<span>Upload from URL</span></button>
    </div>
  </div>`;
}

// Both forms start hidden. main.js reveals only the chosen source inside the
// existing profile card. Separate forms stop a hidden required field blocking Save.
export function profilePhotoEditor(user) {
  return `<div class="photo-editor mb-4" id="photo-editor" role="region" aria-labelledby="photo-heading" hidden>
    <div class="section-header"><h2 class="section-title" id="photo-heading">Edit profile photo</h2><button class="icon-button" type="button" data-action="close-photo-editor" aria-label="Cancel photo edit">${icon("close")}</button></div>
    <p class="form-text" id="photo-help">Choose a JPEG, PNG, or WebP up to 8 MB, 20 megapixels, and 8,192 pixels per side. Your photo will be cropped to fit the circle.</p>
    <form data-form="profile-photo-file" hidden novalidate><fieldset data-photo-controls>
      <label class="form-label" for="profile-photo-file">Upload from computer</label>
      <input class="form-control" id="profile-photo-file" name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help" required>
      <p class="form-error" data-error role="alert"></p><button class="btn btn-outline-secondary" type="submit">Save photo</button>
    </fieldset></form>
    <form data-form="profile-photo-url" hidden novalidate><fieldset data-photo-controls>
      <label class="form-label" for="profile-photo-url">Image URL</label>
      <input class="form-control" id="profile-photo-url" name="photoUrl" type="url" maxlength="2048" placeholder="https://example.com/photo.jpg" aria-describedby="photo-url-help" required>
      <p class="form-text" id="photo-url-help">Use a direct HTTPS link from a host that allows image imports. Loading it contacts that host once; your saved photo stays in this browser.</p>
      <p class="form-error" data-error role="alert"></p><button class="btn btn-outline-secondary" type="submit">Save photo</button>
    </fieldset></form>
    ${isSafePhoto(user.profilePhoto) ? '<form class="mt-3" data-form="profile-photo-remove"><fieldset data-photo-controls><button class="btn btn-link" type="submit">Remove photo and use initials</button><p class="form-error" data-error role="alert"></p></fieldset></form>' : ""}
  </div>`;
}
