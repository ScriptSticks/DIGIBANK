import { DEFAULT_STARTING_BALANCE, STORAGE_KEY, USER_ROLE } from "./constants.js";

function createSeedData() {
  const createdAt = new Date().toISOString();
  return {
    users: [
      { id: "user-demo-customer", fullName: "Amina Okafor", username: "amina", email: "amina@digibank.test", phone: "08012345678", role: USER_ROLE.CUSTOMER, createdAt },
      { id: "user-demo-admin", fullName: "Demo Administrator", username: "admin", email: "admin@digibank.test", phone: "08000000000", role: USER_ROLE.ADMIN, createdAt },
    ],
    accounts: [
      { accountId: "1029384756", userId: "user-demo-customer", balance: DEFAULT_STARTING_BALANCE, status: "ACTIVE", createdAt },
    ],
    transactions: [],
    loans: [],
    notifications: [],
  };
}

export class MockStorage {
  constructor() {
    this.data = this.read();
  }

  read() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.warn("DigiBank mock data could not be read; using fresh fictional data.", error);
    }
    const initialData = createSeedData();
    this.write(initialData);
    return initialData;
  }

  write(nextData = this.data, { requirePersistence = false } = {}) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
    } catch (error) {
      if (requirePersistence) throw new Error("Your photo could not be saved. Browser storage is full or unavailable; free some space and try again.");
      console.warn("DigiBank mock data is available only for this page session.", error);
    }
    this.data = nextData;
  }

  reset() {
    this.data = createSeedData();
    this.write();
    return this.data;
  }
}
