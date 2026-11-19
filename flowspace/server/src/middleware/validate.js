/**
 * Express middleware factory that validates `req[source]` (`body`, `query`, or `params`)
 * against a Zod schema and replaces `req[source]` (and `req.validated`) with the parsed output.
 *
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body' | 'query' | 'params'} [source='body']
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req[source] ?? {});
      req[source] = parsed;
      req.validated = parsed;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export default validate;
