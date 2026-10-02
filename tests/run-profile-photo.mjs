import { runProfilePhotoTests } from "./profile-photo.test.mjs";

const passed = await runProfilePhotoTests();
for (const name of passed) console.log(`PASS ${name}`);
console.log(`${passed.length} profile-photo checks passed.`);
