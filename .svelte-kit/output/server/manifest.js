export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.BPcUKxGO.js",app:"_app/immutable/entry/app.DKQgCWIw.js",imports:["_app/immutable/entry/start.BPcUKxGO.js","_app/immutable/chunks/CAmykaYa.js","_app/immutable/chunks/xRLw6aK5.js","_app/immutable/chunks/OA8UcISh.js","_app/immutable/chunks/_mIV5EeQ.js","_app/immutable/entry/app.DKQgCWIw.js","_app/immutable/chunks/xRLw6aK5.js","_app/immutable/chunks/DTUAfcr0.js","_app/immutable/chunks/Bzak7iHL.js","_app/immutable/chunks/_mIV5EeQ.js","_app/immutable/chunks/DPtC-Vx6.js","_app/immutable/chunks/DD_tHwjj.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js')),
			__memo(() => import('./nodes/12.js')),
			__memo(() => import('./nodes/13.js')),
			__memo(() => import('./nodes/14.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/admin/audit",
				pattern: /^\/admin\/audit\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/admin/departments",
				pattern: /^\/admin\/departments\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/admin/faculty",
				pattern: /^\/admin\/faculty\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/admin/reports",
				pattern: /^\/admin\/reports\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/admin/settings",
				pattern: /^\/admin\/settings\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/api/attachments",
				pattern: /^\/api\/attachments\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/attachments/_server.ts.js'))
			},
			{
				id: "/api/attachments/[id]",
				pattern: /^\/api\/attachments\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/attachments/_id_/_server.ts.js'))
			},
			{
				id: "/api/audit",
				pattern: /^\/api\/audit\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/audit/_server.ts.js'))
			},
			{
				id: "/api/dashboard",
				pattern: /^\/api\/dashboard\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/dashboard/_server.ts.js'))
			},
			{
				id: "/api/dashboard/trends",
				pattern: /^\/api\/dashboard\/trends\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/dashboard/trends/_server.ts.js'))
			},
			{
				id: "/api/departments",
				pattern: /^\/api\/departments\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/departments/_server.ts.js'))
			},
			{
				id: "/api/duties",
				pattern: /^\/api\/duties\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/duties/_server.ts.js'))
			},
			{
				id: "/api/exceptions",
				pattern: /^\/api\/exceptions\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/exceptions/_server.ts.js'))
			},
			{
				id: "/api/notifications",
				pattern: /^\/api\/notifications\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/notifications/_server.ts.js'))
			},
			{
				id: "/api/outreach",
				pattern: /^\/api\/outreach\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/outreach/_server.ts.js'))
			},
			{
				id: "/api/periods",
				pattern: /^\/api\/periods\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/periods/_server.ts.js'))
			},
			{
				id: "/api/report-calendar",
				pattern: /^\/api\/report-calendar\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/report-calendar/_server.ts.js'))
			},
			{
				id: "/api/reports",
				pattern: /^\/api\/reports\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/reports/_server.ts.js'))
			},
			{
				id: "/api/reports/current/export",
				pattern: /^\/api\/reports\/current\/export\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/reports/current/export/_server.ts.js'))
			},
			{
				id: "/api/reports/missing",
				pattern: /^\/api\/reports\/missing\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/reports/missing/_server.ts.js'))
			},
			{
				id: "/api/reports/[id]",
				pattern: /^\/api\/reports\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/reports/_id_/_server.ts.js'))
			},
			{
				id: "/api/reports/[id]/pdf",
				pattern: /^\/api\/reports\/([^/]+?)\/pdf\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/reports/_id_/pdf/_server.ts.js'))
			},
			{
				id: "/api/research",
				pattern: /^\/api\/research\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/research/_server.ts.js'))
			},
			{
				id: "/api/reviews",
				pattern: /^\/api\/reviews\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/reviews/_server.ts.js'))
			},
			{
				id: "/api/users",
				pattern: /^\/api\/users\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/users/_server.ts.js'))
			},
			{
				id: "/calendar",
				pattern: /^\/calendar\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/logout",
				pattern: /^\/logout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/logout/_server.ts.js'))
			},
			{
				id: "/reports",
				pattern: /^\/reports\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/reports/current",
				pattern: /^\/reports\/current\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/reports/current/print",
				pattern: /^\/reports\/current\/print\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 14 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
