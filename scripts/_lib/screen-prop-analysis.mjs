import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export function analyzeScreenProps(root) {
  root = resolve(root);
  const violations = [];
  const screens = [];
  const metadata = [];
  const report = (file, node, message) => {
    const source = node?.getSourceFile();
    const line = source ? source.getLineAndCharacterOfPosition(node.getStart()).line + 1 : 1;
    violations.push(`${relative(root, file)}:${line}: ${message}`);
  };
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isSymbolicLink()) throw new Error(`Unsupported feature symlink: ${file}`);
      else if (/(Screen|Modal|Overlay)\.tsx$/.test(entry.name)) screens.push(file);
      else if (entry.name === 'navigation.ts') metadata.push(file);
    }
  };
  walk(join(root, 'src/features'));
  if (!screens.length || !metadata.length) throw new Error('Required screen/navigation inventory is empty');
  const routesFile = join(root, 'src/navigation/routes.ts');
  const navigationSources = readdirSync(join(root, 'src/navigation'))
    .filter(name => /\.(ts|tsx)$/.test(name)).map(name => join(root, 'src/navigation', name));
  for (const file of [routesFile, ...navigationSources, ...screens, ...metadata]) {
    if (!readFileSync(file, 'utf8').trim()) report(file, null, 'Required source input is empty');
  }
  const configPath = join(root, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  if (parsed.errors.length) throw new Error(parsed.errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  const options = { ...parsed.options, noEmit: true };
  const nativePath = ts.resolveModuleName('@react-navigation/native-stack', routesFile, options, ts.sys).resolvedModule?.resolvedFileName;
  if (!nativePath) throw new Error('Cannot resolve actual @react-navigation/native-stack types');
  const program = ts.createProgram([routesFile, nativePath, ...navigationSources, ...screens, ...metadata], options);
  // Registry imports declare required modules even when filesystem discovery loses one.
  for (const file of navigationSources) {
    for (const statement of program.getSourceFile(file).statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      if (!/\/navigation(?:\.ts)?$/.test(specifier)) continue;
      const resolved = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule?.resolvedFileName;
      if (!resolved || !metadata.includes(resolved)) {
        report(file, statement, `missing required navigation module or unsupported metadata import: ${specifier}`);
      }
    }
  }
  const checker = program.getTypeChecker();
  const unalias = symbol => symbol && (symbol.flags & ts.SymbolFlags.Alias) ? checker.getAliasedSymbol(symbol) : symbol;
  const symbolAt = node => node ? unalias(checker.getSymbolAtLocation(node)) : undefined;
  const exported = (file, name) => {
    const source = program.getSourceFile(file);
    const module = source && checker.getSymbolAtLocation(source);
    return module && unalias(checker.getExportsOfModule(module).find(symbol => symbol.name === name));
  };
  const rootParams = exported(routesFile, 'RootStackParamList');
  const routes = exported(routesFile, 'ROUTES');
  const nativeProps = exported(nativePath, 'NativeStackScreenProps');
  if (!rootParams || !routes || !nativeProps) throw new Error('Missing authoritative RootStackParamList, ROUTES or NativeStackScreenProps export');
  const routeKeys = new Set(checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(rootParams)).map(p => p.name));
  if (!routeKeys.size) throw new Error('RootStackParamList has no route keys');
  for (const diagnostic of program.getSyntacticDiagnostics()) {
    if (diagnostic.file && !diagnostic.file.fileName.includes('/node_modules/')) {
      const line = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1;
      violations.push(`${relative(root, diagnostic.file.fileName)}:${line}: parse error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
    }
  }
  const sameType = (node, expected, seen = new Set()) => {
    if (!node || !ts.isTypeReferenceNode(node)) return false;
    const symbol = symbolAt(node.typeName);
    if (symbol === expected) return true;
    if (!symbol || seen.has(symbol)) return false;
    seen.add(symbol);
    const decl = symbol.declarations?.find(ts.isTypeAliasDeclaration);
    return !!decl && !decl.typeParameters?.length && sameType(decl.type, expected, seen);
  };
  const propRoute = (node, seen = new Set()) => {
    if (node && ts.isIntersectionTypeNode(node)) {
      const navigationTypes = node.types.filter(part => !ts.isTypeLiteralNode(part));
      const extras = node.types.filter(ts.isTypeLiteralNode);
      if (navigationTypes.length !== 1 || extras.some(part => part.members.some(member =>
        !ts.isPropertySignature(member) || !member.name ||
        !ts.isIdentifier(member.name) || ['navigation', 'route'].includes(member.name.text)))) {
        return { error: 'unsupported intersection or navigation/route override' };
      }
      return propRoute(navigationTypes[0], seen);
    }
    if (!node || !ts.isTypeReferenceNode(node)) return { error: 'missing or unsupported component prop annotation' };
    const symbol = symbolAt(node.typeName);
    if (symbol === nativeProps) {
      if (!node.typeArguments || node.typeArguments.length < 2) return { error: 'missing NativeStackScreenProps route argument' };
      if (!sameType(node.typeArguments[0], rootParams)) return { error: 'props must use the actual RootStackParamList' };
      const key = checker.getTypeFromTypeNode(node.typeArguments[1]);
      return key.isStringLiteral() ? { route: key.value } : { error: 'route argument must resolve to one literal route key' };
    }
    if (!symbol || seen.has(symbol)) return { error: 'props do not resolve to actual NativeStackScreenProps' };
    seen.add(symbol);
    const decl = symbol.declarations?.find(ts.isTypeAliasDeclaration);
    return decl && !decl.typeParameters?.length ? propRoute(decl.type, seen) : { error: 'unsupported prop type; expected actual NativeStackScreenProps' };
  };
  const componentFunction = symbol => {
    for (const decl of symbol?.declarations ?? []) {
      if (ts.isFunctionDeclaration(decl)) return decl;
      if (ts.isVariableDeclaration(decl) && decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) return decl.initializer;
    }
    return undefined;
  };
  const registration = new Map();
  const registeredRoutes = new Map();
  for (const file of metadata) {
    let found = 0;
    const visit = node => {
      if (ts.isObjectLiteralExpression(node)) {
        const prop = name => node.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText() === name);
        const component = prop('component');
        const name = prop('name');
        if (component || name) {
          if (!component || !name) report(file, node, 'Unsupported registration: requires name and component');
          else {
            found++;
            const value = name.initializer;
            const route = ts.isPropertyAccessExpression(value) && symbolAt(value.expression) === routes
              ? checker.getTypeAtLocation(value) : undefined;
            const symbol = symbolAt(component.initializer);
            const declaration = componentFunction(symbol);
            const componentFile = declaration?.getSourceFile().fileName;
            if (!route?.isStringLiteral() || !routeKeys.has(route.value)) report(file, value, 'Registration must use a known actual ROUTES key');
            else if (!componentFile || !screens.includes(componentFile) || symbol !== exported(componentFile, 'default')) {
              report(file, component, 'Registration must resolve to a scanned default screen component');
            } else {
              if (registration.has(componentFile) || registeredRoutes.has(route.value)) report(file, node, `Duplicate registration for ${route.value}`);
              registration.set(componentFile, route.value);
              registeredRoutes.set(route.value, componentFile);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(program.getSourceFile(file));
    if (!found) report(file, null, 'No supported component registrations in required metadata');
  }
  let typed = 0;
  const unregistered = [];
  for (const file of screens) {
    const component = componentFunction(exported(file, 'default'));
    const parameter = component?.parameters[0];
    const actual = propRoute(parameter?.type);
    const expected = registration.get(file);
    if (!expected) unregistered.push(relative(root, file));
    if (!component || component.parameters.length !== 1 || parameter?.questionToken || parameter?.dotDotDotToken) {
      report(file, component, 'Unsupported default component: expected one typed props parameter');
    } else if (actual.error) report(file, parameter, `${actual.error}; expected ${expected ?? 'known route'}, actual ${parameter.type?.getText() ?? 'untyped'}`);
    else if (!routeKeys.has(actual.route)) report(file, parameter, `expected ${expected ?? 'known route'}, actual ${actual.route} is not in RootStackParamList`);
    else if (expected && actual.route !== expected) report(file, parameter, `expected ${expected}, actual ${actual.route}`);
    else typed++;
  }
  return { scanned: screens.length, typed, registered: registration.size, unregistered: unregistered.sort(),
    metadataFiles: metadata.length, routeKeys: routeKeys.size, violations, typescript: ts.version };
}
