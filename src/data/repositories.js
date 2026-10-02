import { MockStorage } from "../core/mock-storage.js";

export const storage = new MockStorage();

// Repositories keep browser persistence details out of services and page rendering.
class BaseRepository {
  constructor(collection) {
    this.collection = collection;
  }

  all() {
    return [...storage.data[this.collection]];
  }

  saveAll(records) {
    storage.write({ ...storage.data, [this.collection]: records });
  }
}

export class UserRepository extends BaseRepository {
  constructor() { super("users"); }
  findById(id) { return this.all().find((user) => user.id === id) ?? null; }
  findByEmail(email) { return this.all().find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null; }
  create(user) { this.saveAll([...this.all(), user]); return user; }
  updatePhoto(userId, profilePhoto) {
    const users = this.all().map((user) => user.id === userId ? { ...user, profilePhoto } : user);
    storage.write({ ...storage.data, users }, { requirePersistence: true });
  }
}

export class AccountRepository extends BaseRepository {
  constructor() { super("accounts"); }
  findByUserId(userId) { return this.all().find((account) => account.userId === userId) ?? null; }
  findAccountByAccountId(accountId) { return this.all().find((account) => account.accountId === accountId) ?? null; }
  create(account) { this.saveAll([...this.all(), account]); return account; }
  update(accountId, changes) { this.saveAll(this.all().map((account) => account.accountId === accountId ? { ...account, ...changes } : account)); }
}

export class TransactionRepository extends BaseRepository {
  constructor() { super("transactions"); }
  findForAccount(accountId) { return this.all().filter((item) => item.accountId === accountId).sort((left, right) => right.createdAt.localeCompare(left.createdAt)); }
  createMany(records) { this.saveAll([...this.all(), ...records]); }
}

export class LoanRepository extends BaseRepository {
  constructor() { super("loans"); }
  findForUser(userId) { return this.all().filter((loan) => loan.userId === userId).sort((left, right) => right.createdAt.localeCompare(left.createdAt)); }
  create(loan) { this.saveAll([...this.all(), loan]); return loan; }
  findById(id) { return this.all().find((loan) => loan.id === id) ?? null; }
  update(id, changes) { this.saveAll(this.all().map((loan) => loan.id === id ? { ...loan, ...changes } : loan)); }
}

export class NotificationRepository extends BaseRepository {
  constructor() { super("notifications"); }
  findForUser(userId) { return this.all().filter((notification) => notification.userId === userId).sort((left, right) => right.createdAt.localeCompare(left.createdAt)); }
  create(notification) { this.saveAll([...this.all(), notification]); }
}
