//modules
import type { Directory } from 'ts-morph';
import { VariableDeclarationKind } from 'ts-morph';
//schema
import type Registry from '../../../schema/Registry.js';
import type Model from '../../../schema/spec/Model.js';

export default function removeView(directory: Directory, _registry: Registry, model: Model) {
  const file = `${model.name}/admin/views/remove.tsx`;
  const source = directory.createSourceFile(file, '', { overwrite: true });
  const ids = model.ids.map(column => column.name);
  const path = ids.map(name => `\${results.${name}}`).join('/');
  const link = (action: string) => `\`\${base}/${model.dash}/${action}/${path}\``;
  
  //import 'frui/frui.css';
  //import 'stackpress/fouc.css';

  //import type { ServerPageProps } from 'stackpress/view/client';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: 'stackpress/view/client',
    namedImports: [ 'ServerPageProps' ]
  });
  //import type { AdminConfigProps } from 'stackpress/admin/types';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: 'stackpress/admin/types',
    namedImports: [ 'AdminConfigProps' ]
  });
  //import type { SearchParams } from 'stackpress/sql';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: 'stackpress/sql',
    namedImports: [ 'SearchParams' ]
  });
  //import type { ProfileExtended } from '../../types.js';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: '../../types.js',
    namedImports: [ `${model.title}Extended` ]
  });
  //import { useLanguage } from 'r22n';
  source.addImportDeclaration({
    moduleSpecifier: 'r22n',
    namedImports: [ 'useLanguage' ]
  });
  //import { useServer, Crumbs, LayoutAdmin } from 'stackpress/view/client';
  source.addImportDeclaration({
    moduleSpecifier: 'stackpress/view/client',
    namedImports: [ 'useServer', 'Crumbs', 'LayoutAdmin' ]
  });

  //export function AdminProfileRemoveCrumbs() {}
  source.addFunction({
    isExported: true,
    name: `Admin${model.title}RemoveCrumbs`,
    parameters: [{ 
      name: 'props', 
      type: `{ base: string, results: ${model.title}Extended }` 
    }],
    statements: (`
      const { base, results } = props;
      //hooks
      const { _ } = useLanguage();
      //variables
      const crumbs = [
        {
          label: (
            <span className="admin-crumb">{_('${model.plural}')}</span>
          ),
          icon: '${model.icon}',
          href: \`\${base}/${model.dash}/search\`
        },
        {
          label: (
            <span className="admin-crumb">
              {\`${model.transformTemplate('${results?.%s || \'\'}')}\`}
            </span>
          ),
          icon: '${model.icon}',
          href: ${link('detail')}
        },
        {
          label: _('Remove'),
          icon: 'trash'
        }
      ];
      return (<Crumbs crumbs={crumbs} />);
    `)
  });
  //export function AdminProfileRemoveForm() {}
  source.addFunction({
    isExported: true,
    name: `Admin${model.title}RemoveForm`,
    parameters: [{ 
      name: 'props', 
      type: `{ base: string, results: ${model.title}Extended }` 
    }],
    statements: (`
      const { base, results } = props;
      const { _ } = useLanguage();
      return (
        <div>
          <div className="message">
            <i className="icon fas fa-fw fa-info-circle"></i>
            <strong>
              {_(
                'Are you sure you want to remove %s forever?', 
                \`${model.transformTemplate('${results?.%s || \'\'}')}\`
              )}
            </strong> 
            <br />
            <em>{_('(Thats a real long time)')}</em>
          </div>
          <div className="actions">
            <a className="action cancel" href={${link('detail')}}>
              <i className="icon fas fa-fw fa-arrow-left"></i>
              <span>Nevermind.</span>
            </a>
            <a className="action remove" href="?confirmed=true">
              <i className="icon fas fa-fw fa-trash"></i>
              <span>{_('Confirmed')}</span>
            </a>
          </div>
        </div>
      ); 
    `)
  });
  //export function AdminProfileRemoveBody() {}
  source.addFunction({
    isExported: true,
    name: `Admin${model.title}RemoveBody`,
    statements: (`
      const { config, response } = useServer<${[
        `AdminConfigProps`, 
        'Partial<SearchParams>', 
        `${model.title}Extended`
      ].join(', ')}>();
      const base = config.path('admin.base', '/admin');
      const results = response.results as ${model.title}Extended;
      //render
      return (
        <main className="admin-page admin-confirm-page">
          <div className="admin-crumbs">
            <Admin${model.title}RemoveCrumbs base={base} results={results} />
          </div>
          <div className="admin-confirm">
            <Admin${model.title}RemoveForm base={base} results={results} />
          </div>
        </main>
      );
    `)
  });
  //export function AdminProfileRemoveHead() {}
  source.addFunction({
    isExported: true,
    name: `Admin${model.title}RemoveHead`,
    parameters: [{ 
      name: 'props', 
      type: 'ServerPageProps<AdminConfigProps>'
    }],
    statements: (`
      const { data, styles = [] } = props;
      const { favicon = '/favicon.ico' } = data?.brand || {};
      const { _ } = useLanguage();
      const mimetype = favicon.endsWith('.png')
        ? 'image/png'
        : favicon.endsWith('.svg')
        ? 'image/svg+xml'
        : 'image/x-icon';
      return (
        <>
          <title>{_('Remove ${model.singular}')}</title>
          {favicon && <link rel="icon" type={mimetype} href={favicon} />}
          <link rel="stylesheet" type="text/css" href="/styles/global.css" />
          {styles.map((href, index) => (
            <link key={index} rel="stylesheet" type="text/css" href={href} />
          ))}
        </>
      );  
    `)
  });
  //export function AdminProfileRemovePage() {}
  source.addFunction({
    isExported: true,
    name: `Admin${model.title}RemovePage`,
    parameters: [{ 
      name: 'props', 
      type: 'ServerPageProps<AdminConfigProps>'
    }],
    statements: (`
      return (
        <LayoutAdmin {...props}>
          <Admin${model.title}RemoveBody />
        </LayoutAdmin>
      );  
    `)
  });
  //export const Head = AdminProfileRemoveHead;
  source.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'Head',
      initializer: `Admin${model.title}RemoveHead`
    }]
  });
  //export default AdminProfileRemovePage;
  source.addStatements(`export default Admin${model.title}RemovePage;`);
}