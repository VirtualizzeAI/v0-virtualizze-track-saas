
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
	export interface AppTypes {
		RouteId(): "/" | "/cursos" | "/dashboard" | "/disparo" | "/funcionarios" | "/leads" | "/nova-senha" | "/perfil" | "/super-admin";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/cursos": Record<string, never>;
			"/dashboard": Record<string, never>;
			"/disparo": Record<string, never>;
			"/funcionarios": Record<string, never>;
			"/leads": Record<string, never>;
			"/nova-senha": Record<string, never>;
			"/perfil": Record<string, never>;
			"/super-admin": Record<string, never>
		};
		Pathname(): "/" | "/cursos" | "/cursos/" | "/dashboard" | "/dashboard/" | "/disparo" | "/disparo/" | "/funcionarios" | "/funcionarios/" | "/leads" | "/leads/" | "/nova-senha" | "/nova-senha/" | "/perfil" | "/perfil/" | "/super-admin" | "/super-admin/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | string & {};
	}
}