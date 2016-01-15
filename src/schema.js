import {
  graphql,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from 'graphql'

function parseAddress({ street, secondary, city, state, zip, country }) {
  return {
    street,
    secondary,
    city,
    state,
    zip,
    country,
  }
}

function createBusiness(r, { name, address, latitude, longitude, phone }) {
  return r.table('businesses').insert({
    name,
    address: parseAddress(address),
    location: r.point(longitude, latitude),
    phone,
  }, { returnChanges: true }).run().then(result => result.changes[0].new_val )
}

function getBusiness(r, id) {
  return r.table('businesses').get(id).run()
}

function getBusinesses(r, { limit = 10 }) {
  return r.table('businesses').limit(limit).run()
}

function nearestBusinesses(r, { latitude, longitude, distance = 50 }) {
  var center = r.point(longitude, latitude)

  return r.table('businesses')
          .getNearest(center, { index: 'location', unit: 'mi', maxDist: distance })
          .run()
}

function updateBusiness(r, { name, address, latitude, longitude, phone }) {
  function removeNulls(object, recurse = true) {
    for (var i in objectj) {
        if (objectj[i] === null) {
            delete objectj[i];
        } else if (recurse && typeof objectj[i] === 'object') {
            removeoNulls(objectj[i], recurse);
        }
    }

    return object
  }

  const updates = removeNulls({ name, address, latitude, longitude, phone })

  return r.table('business')
          .update(updates, { returnChanges: true })
          .run()
          .then(result => result.changes[0].new_val)
}

let AddressType = new GraphQLObjectType({
  name: 'Address',
  fields: {
    street: { type: GraphQLString },
    secondary: { type: GraphQLString },
    city: { type: GraphQLString },
    state: { type: GraphQLString },
    zip: { type: GraphQLString },
  }
})

let AddressInputType = new GraphQLInputObjectType({
  name: 'AddressInput',
  fields: {
    street: { type: GraphQLString },
    secondary: { type: GraphQLString },
    city: { type: GraphQLString },
    state: { type: GraphQLString },
    zip: { type: GraphQLString },
  }
})

let BusinessType = new GraphQLObjectType({
  name: 'Business',
  fields: {
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    address: { type: AddressType },
    latitude: { type: GraphQLFloat, resolve: (business) => business.location.coordinates[1] },
    longitude: { type: GraphQLFloat, resolve: (business) => business.location.coordinates[0]  },
  },
})

let GeoSearchResult = new GraphQLObjectType({
  name: 'GeoSearchResult',
  fields: {
    id: { type: GraphQLInt, resolve: (result) => result.doc.id },
    name: { type: GraphQLString, resolve: (result) => result.doc.name },
    address: { type: AddressType, resolve: (result) => result.doc.address },
    latitude: { type: GraphQLFloat, resolve: (result) => result.doc.location.coordinates[1] },
    longitude: { type: GraphQLFloat, resolve: (result) => result.doc.location.coordinates[0]  },
    distance: { type: GraphQLFloat, resolve: (result) => result.dist }
  }
})

let RootQueryType = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    business: {
      type: BusinessType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (parentValue, args, { rootValue: { r } }) => getBusiness(r, args.id)
    },
    businesses: {
      type: new GraphQLList(BusinessType),
      args: {
        limit: { type: GraphQLInt }
      },
      resolve: (parentValue, args, { rootValue: { r } }) => getBusinesses(r, args)
    },
    nearest: {
      type: new GraphQLList(GeoSearchResult),
      args: {
        latitude: { type: GraphQLFloat },
        longitude: { type: GraphQLFloat },
        distance: { type: GraphQLInt },
      },
      resolve: (parentValue, args, { rootValue: { r } }) => nearestBusinesses(r, args)
    }
  }
})

let RootMutationType = new GraphQLObjectType({
  name: 'RootMutationType',
  fields: {
    createBusiness: {
      type: BusinessType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        address: { type: AddressInputType },
        latitude: { type: new GraphQLNonNull(GraphQLFloat) },
        longitude: { type: new GraphQLNonNull(GraphQLFloat) },
        phone: { type: GraphQLString },
      },
      resolve: (parentValue, args, { rootValue: { r } }) => createBusiness(r, args)
    },
    updateBusiness: {
      type: BusinessType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString },
        address: { type: AddressInputType },
        latitude: { type: GraphQLFloat },
        longitude: { type: GraphQLFloat },
        phone: { type: GraphQLString },
      },
      resolve: (parentValue, args, { rootValue: { r } }) => updateBusiness(r, args)
    }
  }
})

export default new GraphQLSchema({
  query: RootQueryType,
  mutation: RootMutationType
})
