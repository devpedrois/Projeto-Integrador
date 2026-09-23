const CHAVE_PADRAO = "origem:v1:modo-acesso";
const VALOR_VISITANTE = "visitante";

export interface ModoAcessoStorage {
  ehVisitante(): boolean;
  definirVisitante(): void;
}

export class SessionModoAcessoStorage implements ModoAcessoStorage {
  constructor(
    private readonly storage: Storage,
    private readonly chave: string = CHAVE_PADRAO
  ) {}

  ehVisitante(): boolean {
    return this.storage.getItem(this.chave) === VALOR_VISITANTE;
  }

  definirVisitante(): void {
    this.storage.setItem(this.chave, VALOR_VISITANTE);
  }
}
