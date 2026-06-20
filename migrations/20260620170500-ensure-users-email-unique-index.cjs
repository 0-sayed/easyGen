const EMAIL_INDEX_NAME = "email_1";
const USERS_COLLECTION = "users";

function isIndexNotFoundError(error) {
  return error?.code === 27 || error?.codeName === "IndexNotFound";
}

module.exports = {
  async up(db) {
    await db
      .collection(USERS_COLLECTION)
      .createIndex({ email: 1 }, { name: EMAIL_INDEX_NAME, unique: true });
  },

  async down(db) {
    try {
      await db.collection(USERS_COLLECTION).dropIndex(EMAIL_INDEX_NAME);
    } catch (error) {
      if (isIndexNotFoundError(error)) {
        return;
      }

      throw error;
    }
  },
};
