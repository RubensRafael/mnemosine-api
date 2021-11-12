// The root provides a resolver function for each API endpoint
var resolvers = {
  hello: () => {
    return 'Hello world!';
  },
};
export default resolvers