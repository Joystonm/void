export let peaceful = new URLSearchParams(globalThis.location?.search ?? '').get('planet') === 'elysia';
export let worldName = peaceful ? 'ELYSIA' : 'AURELIA VEIL';
export function selectWorld(id){peaceful=id==='elysia';worldName=peaceful?'ELYSIA':'AURELIA VEIL';}
