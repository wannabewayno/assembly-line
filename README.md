# Assembly Line
A thin wrapper around the powerful dependency injection framework [Awilix](https://www.npmjs.com/package/awilix).

Assembly Line automates container registrations by using your app's file structure to decide.
  - The name of the registration
  - The type of the registration
  - The lifetime of the registration

Some bonuses include
 - Automatic resolution of the package.json
 - loading of .env files
 - registrations of dependencies, dev dependencies and node apis
 - control over what to:
   - include
   - exclude
   - rename

This has been a personal project that has spun out into an npm module to use throughout my projects as it's really convenient, and convenience is king.

## Installation

```
npm i @wannabewayno/assembly-line
```

*<small>finding an npm name similiar to 'container' is like trying to find an original '.com'</small>*

## Getting started
Assembly Line needs to sit outside of all your source code.

Imagine that the root of your project looks like this:
```
myProject/
    /Config
    /Controllers
    /Models
    /node_modules
    /Services
    /Helpers
    Dockerfile
    index.js
    package-lock.json
    package.json
```

You now want to use some dependency injection, so you'll need to add a folder for your container and move all your source code to into that

```diff
myProject/
    /config
+   /container
+       index.js
    /node_modules
+   /src
        /Controllers
        /Models
        /Services
        /Helpers
    Dockerfile
    index.js
    package-lock.json
    package.json
```

inside `/container/index.js`
```javascript
const assemblyLine = require('@wannabewayno/assembly-line');

module.exports = assemblyLine();
```

That's it! Use it like...

`/index.js`
```javascript
const configureContainer = require('./container');
const container = configureContainer();

const Server = container.resolve('ServerService');

Server.start() // start the app.
```

> Why the double function? I don't see you pass anything to it.

Well, actually you can!, the only thing this is used for at the moment is to override specific registrations for their mock counterpart, if you have any configured.

Please see [mocks](#mocks) for a better explanation

## Changing the way you import and export files.
If you're familiar with Awilix, then you probably don't need to do anything extra but go delete your custom registration and plug this in instead.

If you're new to this then here's a quick example:

Without dependency Injection
```
const sum = require('../../sum.js');
const UserService = require('../../../UserService');

module.exports = (...args) => {
    // do something with args, sum and UserService.
}
```

With Dependency injection (Assembly Line)
```
module.exports = ({
    MathHelper: { sum },
    UserService
}) => (...args) => {
    // do something with args, sum and UserService.
}
```

## package.json registration
For convenience you can access the package.json by resolving the name of the app (as configured in the package.name)

```javascript
const app = container.resolve('my-app');
console.log(app.dependencies);
console.log(app.engine);
console.log(app.repository);
...
```

## Mocks
Mocks, Stubs, fakes, tests, etc... can be configured by telling the container at registration time to swap the real registration out for the mock registration.

This is usually something you'd do when running tests and don't want to use your 'real' service or third-party library. You just want to test the integration of it within it's context.

Simply prefix the name of the registration with 'mock' and if you have a mock of that, we'll swap it out for the real service but under the same registration.

```javascript
const configureContainer = require('./container');
const container = configureContainer();

const containerWithMocks = configureContainer({
    mockAxios: true
});

const realAxios = container.resolve('axios'); // real
const mockAxios = containerWithMocks.resolve('axios'); // mock
```

> Yeah, but how does it know where to find my mock service/function/thing?

That's a great question. At the moment it's a bit crude, you'll need to place all your mocks into a single directory, like 'src/mocks/`.

The default directory we use is `<srcDir>/mocks`, and that's where we start looking for it. You can change this with the [`mock`](#mock) option, but that will still assume a top level file.

It also looks for files with `.mock.js` in the same directory as the real file you want to mock.

In the near future we'll allow more configuration by potentially other forms of mock identifiers, but right now this is what we have to work with.

> I really don't like the word 'mock', I prefer 'fake'

Sure, go nuts, use the `mock` option
```javascript
const configureContainer = assemblyLine({
    mock: 'fake',
});

const container = configureContainer();

const containerWithFakes = configureContainer({
    fakeAxios: true
});

const realAxios = container.resolve('axios'); // real
const mockAxios = containerWithFakes.resolve('axios'); // mock
```
> I'm really pedantic and I know the clear difference between a mock, a fake, a stub, a mimic and a test service. I want this to be reflected in assemblyLine.

Sorry! We currently don't offer that level of fine grained control. If you have some great ideas on turning this into a reality, let us know!

## Options
### **srcDir**
> But I don't put my code in "/src"; I place my code in "/app"!

use the `srcDir` option

```javascript
const assemblyLine = require('@wannabewayno/assembly-line');

module.exports = assemblyLine({
    srcDir: './app'
});
```

> I'm a clever cookie and I use many different containers throughout my application!

configure more than one container and export them!

```javascript
const assemblyLine = require('@wannabewayno/assembly-line');

// Main container
module.exports.main = assemblyLine({
    srcDir: './src/main'
});

// Routes container
module.exports.routes = assemblyLine({
    srcDir: './src/routes'
});
```

### **skipDeps**
> I don't want it to pack up ALL my dependencies!

No worries, tell it not to with the `skipDeps` flag
```javascript
module.exports = assemblyLine({
    skipDeps: true
});
```

### **skipDevDeps**
> But it's still packing up my dev dependencies!

Gotchya, try the `skipDevDeps` flag
```javascript
module.exports = assemblyLine({
    skipDevDeps: true
});
```

### **include**
> Yeah, but I only want *some* of my dependencies to be packed up

hmmmm, try including what you want with `incudeDeps`
or `includeDevDeps`. 
```javascript
module.exports = assemblyLine({
    includeDeps: ['lodash'],
    includeDevDeps: ['mocha'],
});
```

### **exclude**
> I want it to pack up most dependencies, but *not* every dependency and I really don't want to list everything in the include array.

Argh, wouldn't that be annoying, good thing we have an `excludeDeps` and an `excludeDevDeps` option.
```javascript
module.exports = assemblyLine({
    excludeDeps: ['moment']
    excludeDevDeps: ['webpack']
});
```

### **nodeAPIs**
> I'm getting an error where it can't find 'fs/promises' from node_modules?

We bucket nodeAPIs under the `nodeAPIs` option, try asking it to register there instead!
```javascript
module.exports = assemblyLine({
    nodeAPIs: ['fs/promises']
});
```

### **rename**
> some packages are scoped and I don't want to reference them by their '@scoped/name', that's lame!

Rename the things you want to!
```javascript
module.exports = assemblyLine({
    renameDeps: {
        "@googlemaps/google-maps-services-js": 'Maps'
    },
    renameDevDeps: {
        'mongo-memory-server-core' : 'testMongo'
    },
    renameNodeDeps: {
        'fs/promises': 'file'
    }
});

// in some other file
container.resolve('Maps') // google maps
container.resolve('testMongo') // mongo-memory-server-core
container.resolve('file') // fs/promises
```

### **packingStats**
> It's cute that it tells me how long it took to load the container, but I really don't wanna see it; that's just me.

Yeah ok, try disabling the `packingStats` flag
```javascript
module.exports = assemblyLine({
    packingStats: false
}):
```

### **env**
> But I don't place my ".env" file at "config/app.env"!

Whoops! Where do you put it then? You'd better pass that along to `env`!
```javascript
module.exports = assemblyLine({
    env: './app.env',
}):
```

> But I don't even use environment variables! And it keeps looking for environment variables at this default location! So frustrating.

I'm sorry about that! Most projects use environment variables, try turning it off!
```javascript
module.exports = assemblyLine({
    env: false,
}):
```

### **test**
> It's packing up all my tests! ewww.

we're assuming everyone labels their tests like `filename.test.js`, as that's how we do it. If you have a different extension, just let the container know! It won't pack up tests anymore!

```javascript
module.exports = assemblyLine({
    test: '_test_', // file._test_.js
});
```
### **mock**
> How do I set different mock extensions? I don't like using `<service>.mock.js`, I prefer `<service>.fake.js`

This is actually a hard one to solve, and I feel like we're not 100% there yet; but this is what we have come up with.

by using the `mock` option, you can tell the container what your mock files *look* like and where they might be found.

```javascript
module.exports = assemblyLine({
    mock: 'fake'
});
```

This does a few things.
First of all, your mocks,fakes etc... can now be discovered by AssemblyLine in either
- the same directory as the real file but by using the `<service>.fake.js` extension.
- under `src/fakes/<service>.fake.js`

It assumes you have placed your fakes in `src/fakes` and that is non configurable.

You can then opt-in to using fakes by telling the container to do so at runtime by specifying `{ fake<Service>: true }` in camel case.

Examples: 

```javascript
// "mock" the default
const configureContainer = assemblyLine();
const containerWithMocks = configureContainer({
    mockAxios: true // 3rd party service, assumed to be found under /src/mock/axios.mock.js
});

// "fake" dev preference
const configureContainer = assemblyLine({
    mock: 'fake'
});
const containerWithMocks = configureContainer({
    fakeAxios: true // 3rd party service, assumed to be found under /src/fakes/axios.fake.js
});

// "stub" dev preference
const configureContainer = assemblyLine({
    mock: 'stub'
});
const containerWithMocks = configureContainer({
    srcDir: './app',
    mockAxios: true // 3rd party service, assumed to be found under /app/stubs/axios.stub.js
});

// "mimic" dev preference
const configureContainer = assemblyLine({
    mock: 'mimic'
});
const containerWithMocks = configureContainer({
    mimicAxios: true // 3rd party service, assumed to be found under /src/mimics/axios.mimic.js
});

// You get the idea.
```

### **defaultLifetime**
If you're not familiar with Awilix, then either\
A.) Go read their docs\
B.) Just skip over this part.

By default everything is packaged up as a `'SINGLETON'`
. If you want to change that across the board, then use the `defaultLifetime` option.

Available options are
- 'SINGLETON' *default*
- 'TRANSIENT'
- 'SCOPED'

```javascript
module.exports = assemblyLine({
    defaultLifetime: 'TRANSIENT'
});
```

Usually, everything will be a singleton however there cases where you would like to change the lifetime, which you would do when registering the container, however... we've kinda taken that away from you, so no what?

A neat feature that AssemblyLine offers is the ability to change the lifetime of any registered package by specifying this in the filename.

```
/Controllers
    /Orders.scoped
        create.js
        process.js
    /Users.transient
        create.js
        update.scoped.js
        delete.transient.js
/Utils
    handything.scoped.js
```

We recognise that filenames might get tediously long and cumbersome so you can use the shorthands


```
/Controllers
    /Orders.sc
        create.js
        process.js
    /Users.tr
        create.js
        update.sc.js
        delete.tr.js
/Utils
    handything.sc.js
/mocks
    someMock.si.mock.js
```

If this file is directly responsible for a registration then it's lifetime will be the one you set it to in the filename, neat!

We could possibly specify a config file to do a lookup on when registering it if you find this a sticking point, but we're happy with it, so there's no plans on changing this.