// Node APIs
const { readdirSync, statSync } = require('fs');
const path = require('path');
const { performance } =  require('perf_hooks');

// package utils
require('./lib/Set');
require('./lib/String');

// package.json
const packageJSON = require(path.resolve('./package.json'));

// 3rd party packages
const { asClass, asValue, asFunction, Lifetime, createContainer } = require('awilix'); // https://www.npmjs.com/package/awilix
const { singular, plural } = require('pluralize'); // https://www.npmjs.com/package/pluralize
const { config } = require('dotenv');

const mapper = {
    singleton: ['lifetime', Lifetime.SINGLETON],
    transient: ['lifetime', Lifetime.TRANSIENT],
    scoped: ['lifetime', Lifetime.SCOPED],
};

// aliases
mapper.si = mapper.singleton;
mapper.tr = mapper.transient;
mapper.sc = mapper.scoped;

const extensions = new Set(['js','ts', 'json']);
const DO_NOT_REGISTER = Symbol('DO_NOT_REGISTER');

function parseModule(module) {
    if (module === undefined) return DO_NOT_REGISTER;
    if (typeof module !== 'function') return asValue;
    if (module.hasOwnProperty('arguments')) return asFunction;
    if (module.prototype) return asClass;
    else return asFunction;
}

function parseFileName(fileName) {
    const stats = statSync(fileName);
    const { name, base, ext, dir } = path.parse(fileName);
    const pathInfo = name.split('.');
    const isDir = stats.isDirectory();
    let lifetime = this.defaultLifetime;

    // don't register test files, mock files or files that don't match the extension whitelist
    if (!isDir && (!extensions.has(ext) || this.isTest.test(base) || this.isMock.test(base) || dir === this.mocksDir)) return { lifetime: DO_NOT_REGISTER };

    const mockName = ext ? `${name}.${this.mockPrefix}.${ext}` : `${name}/index.${this.mockPrefix}.js`;
    const mockFiles = [path.join(dir, mockName), path.join(this.mocksDir, mockName)];

    const info = { name: pathInfo[0], base, lifetime, isDir, mockFiles };
    const [key, value] = mapper[pathInfo[1]] || [];
    info[key] = value;

    return info;
}

/**
 * Convenience function to read the contents of a dir, pack up the resources and export them as a module
 * Use -> module.exports = require(./packUpDirectory.js)(__dirname)
 * @param {String} dirname - The nodejs __dirname should be passed in to initialise. 
 */
 function packUp(dirname, stack = []) {
    const { isDir, name, lifetime, mockFiles } = parseFileName.bind(this)(dirname);
    if (lifetime === DO_NOT_REGISTER) return; // Don't pack up.
    let Modules = [];

    try {
        // we're meant to use a name if... it's parent is a dir that fails requiring.
        let Module = require(dirname);
        const scopedName = stack.length !== 1 ? name : singular([name, ...stack].join(''));

        if (this.mocks[`${this.mockPrefix}${scopedName.capitalize()}`]) {
            // check to see if this is meant to be mocked and require the mock instead
            try {
                Module = require(mockFiles[0]); // Mocks are either kept next to the file
            } catch(error) {
                try {
                    Module = require(mockFiles[1]); // Or in the common mocks directory.
                } catch (err) {
                    throw new Error(`Mocks Error: Attempted to find ${this.mockPrefix}: ${mockFiles[0]} and when that failed, fell back to looking for ${mockFiles[1]}, but none existed`);
                }
            }
        }
        Modules.push({ Module, type: parseModule(Module), lifetime, name: scopedName });
    } catch (error) {
        if (/Mocks Error:/.test(error.message)) throw error;
        if (isDir) {
            // basically pack everything in this directory up as a factory function
            const subPaths = readdirSync(dirname);           
            let subModules = subPaths.map(subPath => packUp.bind(this)(path.join(dirname, subPath), [name, ...stack])).filter(v => v).flat(1);

            if (stack.length > 0 && subModules.length) {
                let Module = subModules.reduce((modules, { Module, name }) => Object.assign(modules, { [name]: Module }), {});
                subModules = [{
                    name: singular([name, ...stack].join('')),
                    lifetime,
                    type: asFunction,
                    Module: opts => Object.fromEntries(Object.entries(Module).map(([name, Module]) => {
                        try {
                            return [name, Module(opts)]
                        } catch(error) {
                            console.log(error.message, { name, Module });
                        }
                    })),
                }];
            }
            Modules.push(...subModules)
        }
    }
    return Modules.filter(v => v);
}

function register({ modules, rename = {}, exclude = [], include = [], nodeAPIs = false }) {
    const node_modules = nodeAPIs ? '' : path.resolve('./node_modules');

    // find intersection of deps to include.
    if (include.length) modules = modules.intersection(include);

    // exclude deps user does not want.
    if (exclude.length) modules = modules.difference(exclude);

    modules.forEach(module => {
        this[(rename[module] || module).toCamelCase()] = asValue(require(path.join(node_modules, module)));
    });
}

/**
 * ConfigureContainer. return contianer based off some configuration
 * @returns 
 */
module.exports = ({
    skipDeps = false,
    skipDevDeps = false,
    excludeDeps = [],
    includeDeps = [],
    excludeDevDeps = [],
    includeDevDeps = [],
    renameDeps = {},
    renameDevDeps = {},
    renameNodeDeps = {},
    nodeAPIs = [],
    packingStats = true,
    srcDir = './src',
    env = './config/app.env',
    extensions = ['js','ts', 'json'],
    mock = 'mock',
    test = 'test',
    defaultLifetime = 'SINGLETON',
} = {}) => (mocks = {}) => {
    const start = performance.now();
    env && config({ path: path.resolve(env) }); // Load in environment variables

    const container = createContainer();

    const Modules = {
        [`${packageJSON.name.toCamelCase()}`]: asValue(packageJSON),
    }

    const addModules = register.bind(Modules);
    if (!skipDeps) {
        const deps = new Set(Object.keys(packageJSON.dependencies || {}));
        if (deps.size) addModules({ modules: deps, include: includeDeps, exclude: excludeDeps, rename: renameDeps });
    }

    if (!skipDevDeps) {
        const deps = new Set(Object.keys(packageJSON.devDependencies || {}));
        if (deps.size) addModules({ modules: deps, include: includeDevDeps, exclude: excludeDevDeps, rename: renameDevDeps });
    }
    
    if (nodeAPIs.length) addModules({ modules: new Set(nodeAPIs), rename: renameNodeDeps, nodeAPIs: true });
    
    const src = path.resolve(srcDir);

    const context = {
        defaultLifetime: Lifetime[defaultLifetime],
        extensions: new Set(extensions.map(ext => '.' + ext)),
        isMock: new RegExp(`${mock}\\.(${extensions.join('|')})$`),
        isTest: new RegExp(`${test}\\.(${extensions.join('|')})$`),
        mockPrefix: mock,
        mocksDir: path.join(src, plural(mock)),
        mocks,
    }
    readdirSync(src)
    .flatMap(fileOrDir => packUp.bind(context)(path.join(src, fileOrDir)))
    .reduce((modules, v) => {
        if (!v) return modules;
        const { Module, name, type, lifetime } = v;
        Object.assign(modules, { [name]: type(Module, { lifetime }) });
        return modules;
    }, Modules);

    container.register(Modules);
    const end = performance.now();
    if (packingStats) console.log(`Container packed in ${((end - start) / 1000).toFixed(1)} seconds`);
    return container;
}
