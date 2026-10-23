// Mock API boundary. Replace these functions with fetch calls when the backend is ready.
import { initialAccounts, initialListings, initialInquiries } from "./data.js";

const clone = (value) => structuredClone(value);
const pause = () => new Promise((resolve) => setTimeout(resolve, 380));

let listings = clone(initialListings);
let accounts = clone(initialAccounts);
let inquiries = clone(initialInquiries);
let nextListingId = 21;
let nextInquiryId = 5;
let nextAccountId = 10;

function byNewest(first, second) {
  return new Date(second.createdAt) - new Date(first.createdAt);
}

export const api = {
  async getListings(filters = {}) {
    await pause();

    let results = listings.filter(
      (book) => filters.includeHidden || book.status === "Available",
    );

    if (filters.ownerId)
      results = results.filter((book) => book.ownerId === filters.ownerId);
    if (filters.query) {
      const query = filters.query.toLowerCase();
      results = results.filter((book) =>
        [book.title, book.author, book.isbn].some((value) =>
          value?.toLowerCase().includes(query),
        ),
      );
    }
    if (filters.course) {
      results = results.filter((book) =>
        book.course.toLowerCase().includes(filters.course.toLowerCase()),
      );
    }
    if (filters.condition)
      results = results.filter((book) => book.condition === filters.condition);
    if (filters.min !== "" && filters.min != null) {
      results = results.filter((book) => book.price >= Number(filters.min));
    }
    if (filters.max !== "" && filters.max != null) {
      results = results.filter((book) => book.price <= Number(filters.max));
    }

    if (filters.sort === "price-low") results.sort((a, b) => a.price - b.price);
    else if (filters.sort === "price-high")
      results.sort((a, b) => b.price - a.price);
    else results.sort(byNewest);

    return clone(results);
  },

  async getListing(id) {
    await pause();
    return clone(listings.find((book) => book.id === id) || null);
  },

  async createListing(data, ownerId) {
    await pause();
    const listing = {
      ...data,
      id: `b${nextListingId++}`,
      ownerId,
      status: "Available",
      createdAt: new Date().toISOString(),
      color: "#E4472B",
    };
    listings.unshift(listing);
    return clone(listing);
  },

  async updateListing(id, data, actor) {
    await pause();
    const listing = listings.find((book) => book.id === id);
    if (!listing || (actor.role !== "admin" && listing.ownerId !== actor.id)) {
      throw Error("You do not have permission to edit this listing.");
    }
    Object.assign(listing, data);
    return clone(listing);
  },

  async deleteListing(id, actor) {
    await pause();
    const listing = listings.find((book) => book.id === id);
    if (!listing || (actor.role !== "admin" && listing.ownerId !== actor.id)) {
      throw Error("You do not have permission to delete this listing.");
    }
    listings = listings.filter((book) => book.id !== id);
    inquiries = inquiries.filter((inquiry) => inquiry.listingId !== id);
    return true;
  },

  async getAccounts() {
    await pause();
    return clone(accounts);
  },

  async register(data) {
    await pause();
    if (
      accounts.some(
        (account) => account.email.toLowerCase() === data.email.toLowerCase(),
      )
    ) {
      throw Error("This email is already registered.");
    }
    const account = {
      ...data,
      id: `u${nextAccountId++}`,
      role: "student",
      status: "Active",
    };
    accounts.push(account);
    return clone(account);
  },

  async signIn(email, password) {
    await pause();
    const account = accounts.find(
      (item) => item.email.toLowerCase() === email.toLowerCase(),
    );
    if (!account || password.length < 6)
      throw Error("Email or password is incorrect.");
    if (account.status === "Suspended") {
      throw Error(
        "This account is suspended. Please contact the library desk.",
      );
    }
    return clone(account);
  },

  async updateProfile(id, data) {
    await pause();
    const account = accounts.find((item) => item.id === id);
    if (!account) throw Error("Account not found.");
    if (
      data.email &&
      accounts.some(
        (item) =>
          item.id !== id &&
          item.email.toLowerCase() === data.email.toLowerCase(),
      )
    ) {
      throw Error("This email is already registered.");
    }
    Object.assign(account, data, {
      email: data.email?.toLowerCase() || account.email,
    });
    return clone(account);
  },

  async sendInquiry(data, sender) {
    await pause();
    const listing = listings.find((book) => book.id === data.listingId);
    if (!listing || listing.status !== "Available")
      throw Error("This book is no longer available.");
    if (listing.ownerId === sender.id)
      throw Error("You cannot message yourself about your own listing.");

    const inquiry = {
      ...data,
      id: `q${nextInquiryId++}`,
      senderId: sender.id,
      recipientId: listing.ownerId,
      createdAt: new Date().toISOString(),
    };
    inquiries.unshift(inquiry);
    return clone(inquiry);
  },

  async getInquiries(user) {
    await pause();
    return clone(
      inquiries.filter(
        (inquiry) =>
          user.role === "admin" ||
          inquiry.recipientId === user.id ||
          inquiry.senderId === user.id,
      ),
    );
  },

  async deleteInquiry(id, actor) {
    await pause();
    if (actor.role !== "admin")
      throw Error("Only an administrator can moderate inquiries.");
    const exists = inquiries.some((inquiry) => inquiry.id === id);
    inquiries = inquiries.filter((inquiry) => inquiry.id !== id);
    return exists;
  },

  async adminAccount(id, action) {
    await pause();
    const account = accounts.find((item) => item.id === id);
    if (!account) throw Error("Account not found.");
    if (account.role === "admin")
      throw Error("The administrator account cannot be changed here.");

    if (action === "delete") {
      const ownedListingIds = listings
        .filter((book) => book.ownerId === id)
        .map((book) => book.id);
      listings = listings.filter((book) => book.ownerId !== id);
      inquiries = inquiries.filter(
        (inquiry) =>
          inquiry.senderId !== id &&
          inquiry.recipientId !== id &&
          !ownedListingIds.includes(inquiry.listingId),
      );
      accounts = accounts.filter((item) => item.id !== id);
      return true;
    }

    account.status = action === "suspend" ? "Suspended" : "Active";
    return clone(account);
  },

  async adminListing(id, action) {
    await pause();
    const listing = listings.find((book) => book.id === id);
    if (!listing) throw Error("Listing not found.");
    if (action === "delete")
      return this.deleteListing(id, { role: "admin", id: "admin1" });
    listing.status = action;
    return clone(listing);
  },

  async getCounts() {
    await pause();
    return {
      accounts: accounts.length,
      available: listings.filter((book) => book.status === "Available").length,
      sold: listings.filter((book) => book.status === "Sold").length,
    };
  },
};
