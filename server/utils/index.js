const { generateHash } = require('./generate-hash');
const { getRandom } = require('./get-random');
const { last } = require('./last');
const { nextIndex } = require('./next-index');
const { indexById } = require('./index-by-id');

module.exports = {
  getRandom,
  generateHash,
  last,
  nextIndex,
  indexById
}
