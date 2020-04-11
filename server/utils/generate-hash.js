const generateHash = () => Math.round(Math.random() * 100000000 + 1000000000).toString(36).toLowerCase();

module.exports = {
  generateHash
};
