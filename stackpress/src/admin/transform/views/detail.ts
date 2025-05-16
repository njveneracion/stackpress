//modules
import type { Directory } from 'ts-morph';
import { VariableDeclarationKind } from 'ts-morph';
//schema
import type Registry from '../../../schema/Registry.js';
import type Model from '../../../schema/spec/Model.js';

export default function detailView(directory: Directory, _registry: Registry, model: Model) {
  const file = `${model.name}/admin/views/detail.tsx`;
  const source = directory.createSourceFile(file, '', { overwrite: true });
  const ids = model.ids.map(column => column.name);
  const path = ids.map(name => `\${results.${name}}`).join('/');
  const link = (
    action: string,
    extras = ''
  ) => `\`\${base}/${model.dash}/${action}/${path}${extras}\``;
  
  //import 'frui/frui.css';
  //import 'stackpress/fouc.css';

  //import type { ServerPageProps, AdminConfigProps } from 'stackpress/view/client';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: 'stackpress/view/client',
    namedImports: [ 'ServerPageProps', 'SessionPermission' ]
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
  //import { Table, Trow, Tcol } from 'frui/element/Table';
  source.addImportDeclaration({
    moduleSpecifier: 'frui/element/Table',
    namedImports: [ 'Table', 'Trow', 'Tcol' ]
  });
  //import { useServer, useStripe, Crumbs, LayoutAdmin } from 'stackpress/view/client';
  source.addImportDeclaration({
    moduleSpecifier: 'stackpress/view/client',
    namedImports: [ 'useServer', 'useStripe', 'Crumbs', 'LayoutAdmin' ]
  });
  //import CreatedViewFormat from '../../components/views/CreatedViewFormat.js';
  model.views.forEach(column => {
    //skip if no component
    if (typeof column.view.component !== 'string') return;
    source.addImportDeclaration({
      moduleSpecifier: `../../components/views/${column.title}ViewFormat.js`,
      defaultImport: `${column.title}ViewFormat`
    });
  });

  //export function AdminProfileDetailCrumbs() {}
  source.addFunction({
    isExported: true,
    name: `Admin${model.title}DetailCrumbs`,
    parameters: [{ 
      name: 'props', 
      type: `{ base: string, results: ${model.title}Extended }` 
    }],
    statements: (`
      //props
      const { base, results } = props;
      //hooks
      const { _ } = useLanguage();
      //variables
      const crumbs = [
        {
          label: (<span className="admin-crumb">{_('${model.plural}')}</span>),
          icon: '${model.icon}',
          href: \`\${base}/${model.dash}/search\`
        },
        {
          label: \`${model.transformTemplate('${results?.%s || \'\'}')}\`,
          icon: '${model.icon}'
        }
      ];
      return (<Crumbs crumbs={crumbs} />);
    `)
  });
  //export function AdminProfileDetailActions() {}
  source.addFunction({
    isExported: true,
    name: `Admin${model.title}DetailActions`,
    parameters: [{ 
      name: 'props', 
      type: `{
        base: string,
        results: ${model.title}Extended,
        can: (...permits: SessionPermission[]) => boolean,
      }` 
    }],
    statements: (`
      const { base, results, can } = props;
      const { _ } = useLanguage();
      const routes = {
        update: { 
          method: 'GET', 
          route: ${link('update')}
        },
        remove: { 
          method: 'GET', 
          route: ${link('remove')}
        },
        restore: { 
          method: 'GET', 
          route: ${link('restore')}
        },
      };
      return (
        <div className="actions">
          {can(routes.update) && (
            <a className="action update" href={routes.update.route}>
              <i className="icon fas fa-edit"></i>
              {_('Update')}
            </a>
          )}
          {results.active && can(routes.remove) && (
            <a className="action remove" href={routes.remove.route}>
              <i className="icon fas fa-trash"></i>
              {_('Remove')}
            </a>
          )}
          {!results.active && can(routes.restore) && (
            <a className="action restore" href={routes.restore.route}>
              <i className="icon fas fa-check-circle"></i>
              {_('Restore')}
            </a>
          )}
        </div>
      );
    `)
  });
  //export function AdminProfileDetailResults() {}
  source.addFunction({
    isExported: true,
    name: `Admin${model.title}DetailResults`,
    parameters: [{ 
      name: 'props', 
      type: `{ results: ${model.title}Extended }` 
    }],
    statements: (`
      const { results } = props;
      const { _ } = useLanguage();
      const stripe = useStripe('results-row-1', 'results-row-2');
      return (
        <Table>
          ${model.views.filter(
            column => column.view.method !== 'hide'
          ).map(column => {
            return (`
              <Trow>
                <Tcol noWrap className={\`results-label \${stripe(true)}\`}>
                  {_('${column.label}')}
                </Tcol>
                <Tcol noWrap className={\`results-value \${stripe()}\`}>
                  ${column.required && !column.view.component
                    ? `{results.${column.name}.toString()}`
                    : column.required && column.view.component
                    ? `<${column.title}ViewFormat data={results} value={results.${column.name}} />`
                    : !column.required && !column.view.component
                    ? `{results.${column.name} ? results.${column.name}.toString() : ''}`
                    //!column.required && column.view.component
                    : `{results.${column.name} ? (<${column.title}ViewFormat data={results} value={results.${column.name}} />) : ''}`
                  }
                </Tcol>
              </Trow>
            `);
          })}
        </Table>
      ); 
    `)
  });
  //export function AdminProfileDetailBody() {}
  source.addFunction({
    isExported: true,
    name: `Admin${model.title}DetailBody`,
    statements: (`
      const { config, session, response } = useServer<${[
        `AdminConfigProps`, 
        'Partial<SearchParams>', 
        `${model.title}Extended`
      ].join(', ')}>();
      const can = session.can.bind(session);
      const base = config.path('admin.base', '/admin');
      const results = response.results as ${model.title}Extended;
      //render
      return (
        <main className="admin-detail-page admin-page">
          <div className="admin-crumbs">
            <Admin${model.title}DetailCrumbs base={base} results={results} />
          </div>
          <div className="admin-actions">
            <Admin${model.title}DetailActions 
              can={can} 
              base={base} 
              results={results} 
            />
          </div>
          <div className="admin-results">
            <Admin${model.title}DetailResults results={results} />
          </div>
        </main>
      );  
    `)
  });
  //export function AdminProfileDetailHead() {}
  source.addFunction({
    isExported: true,
    name: `Admin${model.title}DetailHead`,
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
          <title>{_('${model.singular} Detail')}</title>
          {favicon && <link rel="icon" type={mimetype} href={favicon} />}
          <link rel="stylesheet" type="text/css" href="/styles/global.css" />
          {styles.map((href, index) => (
            <link key={index} rel="stylesheet" type="text/css" href={href} />
          ))}
        </>
      );  
    `)
  });
  //export function AdminProfileDetailPage() {}
  source.addFunction({
    isExported: true,
    name: `Admin${model.title}DetailPage`,
    parameters: [{ 
      name: 'props', 
      type: 'ServerPageProps<AdminConfigProps>'
    }],
    statements: (`
      return (
        <LayoutAdmin {...props}>
          <Admin${model.title}DetailBody />
        </LayoutAdmin>
      );
    `)
  });
  //export const Head = AdminProfileDetailHead;
  source.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'Head',
      initializer: `Admin${model.title}DetailHead`
    }]
  });
  //export default AdminProfileDetailPage;
  source.addStatements(`export default Admin${model.title}DetailPage;`);
}