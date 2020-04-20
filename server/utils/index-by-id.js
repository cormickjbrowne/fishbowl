exports.indexById = (arr) => arr.reduce((agg, curr) => ({ ...agg, [curr.id]: curr }), {});
