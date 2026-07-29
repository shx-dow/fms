
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/admin" | "/admin/audit" | "/admin/departments" | "/admin/faculty" | "/admin/reports" | "/admin/settings" | "/api" | "/api/attachments" | "/api/attachments/[id]" | "/api/audit" | "/api/dashboard" | "/api/dashboard/trends" | "/api/departments" | "/api/duties" | "/api/exceptions" | "/api/notifications" | "/api/outreach" | "/api/periods" | "/api/report-calendar" | "/api/reports" | "/api/reports/current" | "/api/reports/current/export" | "/api/reports/missing" | "/api/reports/[id]" | "/api/research" | "/api/reviews" | "/api/users" | "/calendar" | "/dashboard" | "/login" | "/logout" | "/notifications" | "/reports" | "/reports/current" | "/reports/current/print";
		RouteParams(): {
			"/api/attachments/[id]": { id: string };
			"/api/reports/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string | undefined };
			"/admin": Record<string, never>;
			"/admin/audit": Record<string, never>;
			"/admin/departments": Record<string, never>;
			"/admin/faculty": Record<string, never>;
			"/admin/reports": Record<string, never>;
			"/admin/settings": Record<string, never>;
			"/api": { id?: string | undefined };
			"/api/attachments": { id?: string | undefined };
			"/api/attachments/[id]": { id: string };
			"/api/audit": Record<string, never>;
			"/api/dashboard": Record<string, never>;
			"/api/dashboard/trends": Record<string, never>;
			"/api/departments": Record<string, never>;
			"/api/duties": Record<string, never>;
			"/api/exceptions": Record<string, never>;
			"/api/notifications": Record<string, never>;
			"/api/outreach": Record<string, never>;
			"/api/periods": Record<string, never>;
			"/api/report-calendar": Record<string, never>;
			"/api/reports": { id?: string | undefined };
			"/api/reports/current": Record<string, never>;
			"/api/reports/current/export": Record<string, never>;
			"/api/reports/missing": Record<string, never>;
			"/api/reports/[id]": { id: string };
			"/api/research": Record<string, never>;
			"/api/reviews": Record<string, never>;
			"/api/users": Record<string, never>;
			"/calendar": Record<string, never>;
			"/dashboard": Record<string, never>;
			"/login": Record<string, never>;
			"/logout": Record<string, never>;
			"/notifications": Record<string, never>;
			"/reports": Record<string, never>;
			"/reports/current": Record<string, never>;
			"/reports/current/print": Record<string, never>
		};
		Pathname(): "/" | "/admin" | "/admin/audit" | "/admin/departments" | "/admin/faculty" | "/admin/reports" | "/admin/settings" | "/api/attachments" | `/api/attachments/${string}` & {} | "/api/audit" | "/api/dashboard" | "/api/dashboard/trends" | "/api/departments" | "/api/duties" | "/api/exceptions" | "/api/notifications" | "/api/outreach" | "/api/periods" | "/api/report-calendar" | "/api/reports" | "/api/reports/current/export" | "/api/reports/missing" | `/api/reports/${string}` & {} | "/api/research" | "/api/reviews" | "/api/users" | "/calendar" | "/dashboard" | "/login" | "/logout" | "/notifications" | "/reports" | "/reports/current" | "/reports/current/print";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}