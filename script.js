const PALOS = ["Espadas", "Corazones", "Tréboles", "Diamantes"];
const PALOS_SIMBOLO = { Espadas: "♠", Corazones: "♥", Tréboles: "♣", Diamantes: "♦" };
const VALORES = [2,3,4,5,6,7,8,9,10,"J","Q","K","A"];
const VALOR_NUM = v => (typeof v === "number" ? v : (v==="J"?11:v==="Q"?12:v==="K"?13:14));

function obtenerEfecto(palo, valor) {
    if (palo === "Tréboles") {
        switch (valor) {
            case 2: return "+2 defensa a todas las cartas de Corazones en el campo.";
            case 3: return "+2 ataque a todas las cartas de Espadas en el campo.";
            case 4: return "Evita un ataque de cualquier carta.";
            case 5: return "Cura 2 puntos de vida al jugador.";
            case 6: return "Redirige un ataque hacia otra carta.";
            case 7: return "Si recibes daño, robas 2 cartas.";
            case 8: return "Anula el efecto de una carta.";
            case 9: return "Recupera una carta del cementerio a la mano.";
            case 10: return "Elimina todos los efectos activos en el campo.";
            case "J": return "Limita la invocación del oponente a 1 carta por su próximo turno.";
            case "Q": return "Permite jugar una carta sin coste de sacrificio.";
            case "K": return "Reduce el ataque de todas las cartas enemigas en 2 puntos.";
            case "A": return "Invoca una carta como respuesta a una acción del oponente.";
        }
    }
    if (palo === "Diamantes") {
        switch (valor) {
            case 2: return "Roba 1 carta.";
            case 3: return "Oponente descarta 1 carta al azar.";
            case 4: return "Mira la mano del oponente.";
            case 5: return "Cambia el valor de una carta por 1 turno.";
            case 6: return "Copia el efecto de otra carta en juego.";
            case 7: return "Ganas 2 puntos de vida.";
            case 8: return "Bloquea cartas de soporte y magia enemigas por 1 turno.";
            case 9: return "Revive una carta del cementerio.";
            case 10: return "Roba 3 cartas.";
            case "J": return "Destruye cualquier carta en juego.";
            case "Q": return "Bloquea permanentemente una carta enemiga hasta que se juegue un efecto para desactivarla.";
            case "K": return "Oponente pierde 3 puntos de vida.";
            case "A": return "Juega otro turno inmediatamente.";
        }
    }
    return "";
}

function crearBaraja() {
    let baraja = [];
    for (let palo of PALOS) {
        for (let valor of VALORES) {
            baraja.push({
                palo,
                valor,
                simbolo: PALOS_SIMBOLO[palo],
                id: `${palo}-${valor}-${Math.random().toString(36).substr(2,5)}`,
                efecto: obtenerEfecto(palo, valor)
            });
        }
    }
    return baraja;
}

class Jugador {
    constructor(nombre, esIA=false) {
        this.nombre = nombre;
        this.vida = 20;
        this.baraja = []; // Se asigna al repartirMazo
        this.mano = [];
        this.campo = [];
        this.cementerio = [];
        this.invocacionesEsteTurno = 0;
        this.limiteInvocacion = 3;
        this.esIA = esIA;
    }
    robar(n=1) {
        for(let i=0;i<n;i++) {
            if(this.baraja.length>0) this.mano.push(this.baraja.pop());
        }
    }
    resetTurno() {
        this.invocacionesEsteTurno = 0;
        this.limiteInvocacion = 3;
        // Reiniciar estado de ataque de cartas en campo
        this.campo.forEach(c => {
            c.yaAtaco = false;
            c.dobleAtaco = false;
        });
    }
}

let jugador1 = new Jugador("Jugador 1");
let jugador2 = new Jugador("Jugador 2", true); // IA
let turno = 1; // 1: jugador 1, 2: jugador 2
let fase = 0; // 0: Robo, 1: Invocación, 2: Activación, 3: Ataque, 4: Final
let sacrificiosSeleccionados = [];
let cartaAInvocar = null;
let primerTurno = true;
let primerTurnoGlobal = true;

document.getElementById("siguienteFaseBtn").onclick = ()=>{
    if(getJugadorActual().esIA) return;
    if(fase === 1) {
        fase++;
        siguienteFase();
    } else if(fase === 3) {
        prepararAtaque();
    } else {
        fase++;
        siguienteFase();
    }
};
document.getElementById("pasarTurnoBtn").onclick = ()=>{
    if(getJugadorActual().esIA) return;
    fase = 4;
    siguienteFase();
};

function siguienteFase() {
    limpiarResaltados();
    let btn = document.getElementById("btnPasarDefensa");
    if(btn) btn.remove();
    actualizarUI();

    // Fase 0: Robo
    if(fase === 0) {
        getJugadorActual().robar();
        actualizarUI();
        fase++;
        setTimeout(siguienteFase, 400);
        return;
    }

    // Fase 1: Invocación
    if(fase === 1) {
        let jugador = getJugadorActual();
        // Puede invocar si tiene cartas <10 o si tiene cartas >=10 Y suficientes cartas en campo para sacrificar
        let puedeInvocar = jugador.mano.some((carta) => {
            let valor = VALOR_NUM(carta.valor);
            if (valor < 10) return true;
            // Para cartas de sacrificio, debe tener suficientes cartas en el campo para sumar el valor exacto
            if (jugador.campo.length === 0) return false;
            // Combinatoria para ver si puede sacrificar
            let valoresCampo = jugador.campo.map(c=>VALOR_NUM(c.valor));
            // Algoritmo para ver si alguna combinación suma exactamente el valor requerido
            function puedeSumar(valores, objetivo, start=0) {
                if(objetivo === 0) return true;
                for(let i=start; i<valores.length; i++) {
                    if(valores[i] <= objetivo) {
                        if(puedeSumar(valores, objetivo-valores[i], i+1)) return true;
                    }
                }
                return false;
            }
            return puedeSumar(valoresCampo, valor);
        });
        if(jugador.invocacionesEsteTurno >= jugador.limiteInvocacion || !puedeInvocar) {
            fase++;
            setTimeout(siguienteFase, 400);
            return;
        }
        if(jugador.esIA) {
            setTimeout(iaInvocacion, 1200);
            return;
        } else {
            mostrarMensaje(`Selecciona una carta de tu mano para invocar (máx ${jugador.limiteInvocacion} por turno) o pulsa Siguiente Fase.`);
            return;
        }
    }

    // Fase 2: Activación
    if(fase === 2) {
        let jugador = getJugadorActual();
        let tieneActivacion = jugador.campo.some(c => (c.palo==="Tréboles"||c.palo==="Diamantes"));
        if(!tieneActivacion) {
            fase++;
            setTimeout(siguienteFase, 400);
            return;
        }
        if(jugador.esIA) {
            setTimeout(iaActivacion, 1200);
            return;
        } else {
            mostrarMensaje("Selecciona una carta de Tréboles o Diamantes para activar o pulsa Siguiente Fase.");
            return;
        }
    }

    // Fase 3: Ataque
    if(fase === 3) {
        if(primerTurno) {
            mostrarMensaje("No puedes atacar en el primer turno.");
            primerTurno = false;
            fase++;
            setTimeout(siguienteFase, 600);
            return;
        }
        let jugador = getJugadorActual();
        let tieneAtaque = jugador.campo.some(c => c.palo==="Espadas" && !c.yaAtaco);
        if(!tieneAtaque) {
            fase++;
            setTimeout(siguienteFase, 400);
            return;
        }
        if(jugador.esIA) {
            setTimeout(iaAtaque, 1500);
            return;
        } else {
            mostrarMensaje("Selecciona una carta de Espadas en tu campo para atacar o pulsa Siguiente Fase.");
            prepararAtaque();
            return;
        }
    }

    // Fase 4: Final
    if(fase === 4) {
        let jugador = getJugadorActual();
        if(jugador.robarSiRecibeDanioTurnos) {
            jugador.robarSiRecibeDanio--;
            if(jugador.robarSiRecibeDanio === 0) {
                jugador.robarSiRecibeDanio = 0;
            }
        }
        jugador.resetTurno();
        sacrificiosSeleccionados = [];
        cartaAInvocar = null;
        jugador.puedeInvocarSinSacrificio = false;
        if (jugador.turnoExtra) {
            jugador.turnoExtra = false;
            fase = 0;
            setTimeout(siguienteFase, 600);
            return;
        }
        turno = turno === 1 ? 2 : 1;
        fase = 0;
        primerTurno = false;
        setTimeout(siguienteFase, 600);
        return;
    }
}

function getJugadorActual() { return turno===1?jugador1:jugador2; }
function getOponente() { return turno===1?jugador2:jugador1; }

function actualizarUI() {
    document.getElementById("vida1").textContent = jugador1.vida;
    document.getElementById("vida2").textContent = jugador2.vida;
    document.getElementById("baraja1Count").textContent = jugador1.baraja.length;
    document.getElementById("baraja2Count").textContent = jugador2.baraja.length;
    document.getElementById("turnoInfo").textContent = `Turno: Jugador ${turno}`;
    document.getElementById("faseInfo").textContent = `Fase: ${["Robo","Invocación","Activación","Ataque","Final"][fase]}`;
    mostrarManos();
    mostrarCampo();
    mostrarCementerio();
    document.getElementById("sacrificioArea").innerHTML = "";
}

function mostrarManos() {
    ["mano1","mano2"].forEach((id,i)=>{
        let jugador = i===0?jugador1:jugador2;
        let cont = document.getElementById(id);
        cont.innerHTML = "";
        jugador.mano.forEach((carta,idx)=>{
            let el = document.createElement("div");
            el.className = "carta";
            if ((turno === i+1 && !jugador.esIA) || (i === 0 && !jugador2.esIA)) {
                el.textContent = `${carta.simbolo} ${carta.valor}`;
                if (carta.efecto) el.title = carta.efecto;
                el.classList.add("invocable"); // borde azul
                el.onclick = () => mostrarModalCartaMano(carta, idx, jugador);
            } else {
                el.textContent = "🂠";
                el.title = "";
                el.onclick = ()=>mostrarModalCarta(carta);
            }
            cont.appendChild(el);
        });
    });
}

function mostrarCampo() {
    [["campo1-ataque","campo1-apoyo",jugador1],["campo2-ataque","campo2-apoyo",jugador2]].forEach(([idAtk,idApoyo,jugador],jIndex)=>{
        let contAtk = document.getElementById(idAtk);
        let contApoyo = document.getElementById(idApoyo);
        contAtk.innerHTML = "";
        contApoyo.innerHTML = "";
        jugador.campo.forEach((carta,idx)=>{
            let el = document.createElement("div");
            el.className = "carta";
            el.textContent = `${carta.simbolo} ${carta.valor}`;
            // Tooltips para efectos
            if (carta.palo === "Espadas") el.title = "Ataque: " + descripcionEspada(carta.valor);
            else if (carta.palo === "Corazones") el.title = "Defensa: " + descripcionCorazon(carta.valor);
            else if (carta.palo === "Tréboles") el.title = "Soporte/Magia: " + descripcionTrebol(carta.valor);
            else if (carta.palo === "Diamantes") el.title = "Magia: " + descripcionDiamante(carta.valor);

            // Permitir activar tréboles y diamantes en fase 2
            if(turno === jIndex+1 && fase === 2 && !jugador.esIA && (carta.palo === "Tréboles" || carta.palo === "Diamantes")) {
                el.classList.add("invocable");
                el.onclick = ()=>activarEfectoCampo(idx);
            } else if(turno === jIndex+1 && fase === 3 && !jugador.esIA && carta.palo === "Espadas" && !carta.yaAtaco) {
                // Permitir atacar
                el.classList.add("invocable");
                el.onclick = ()=>realizarAtaque(jugador.campo.indexOf(carta));
            } else {
                el.onclick = ()=>mostrarModalCarta(carta);
            }

            if (["Espadas","Corazones"].includes(carta.palo)) contAtk.appendChild(el);
            else contApoyo.appendChild(el);
        });
    });
}

function mostrarCementerio() {
    ["cementerio1","cementerio2"].forEach((id,i)=>{
        let jugador = i===0?jugador1:jugador2;
        let cont = document.getElementById(id);
        cont.innerHTML = "";
        if(jugador.cementerio.length > 0) {
            let carta = jugador.cementerio[jugador.cementerio.length-1];
            let el = document.createElement("div");
            el.className = "carta";
            el.textContent = `${carta.simbolo} ${carta.valor}`;
            if (carta.efecto) el.title = carta.efecto;
            el.onclick = ()=>mostrarModalCarta(carta);
            cont.appendChild(el);
        }
    });
}

// Funciones para descripciones de efectos
function descripcionTrebol(valor) {
    switch(valor) {
        case 2: return "+2 defensa a tus Corazones este turno.";
        case 3: return "+2 ataque a tus Espadas este turno.";
        case 4: return "Evita el próximo ataque recibido.";
        case 5: return "Cura 2 puntos de vida.";
        case 6: return "Redirige el ataque a otra carta de defensa.";
        case 7: return "Si recibes daño, robas 2 cartas hasta tu próximo turno.";
        case 8: return "Niega el efecto de una carta en juego.";
        case 9: return "Recupera una carta del cementerio a tu mano.";
        case 10: return "Elimina todos los efectos activos en el campo.";
        case "J": return "El oponente solo puede invocar 1 carta en su próximo turno.";
        case "Q": return "Puedes invocar una carta sin sacrificio este turno.";
        case "K": return "Reduce el ataque de todas las Espadas enemigas en 2 este turno.";
        case "A": return "Puedes invocar una carta como respuesta a una acción enemiga.";
        default: return "";
    }
}
function descripcionDiamante(valor) {
    switch(valor) {
        case 2: return "Robas 1 carta.";
        case 3: return "El oponente descarta 1 carta al azar.";
        case 4: return "Mira la mano del oponente.";
        case 5: return "Cambia el valor de una carta propia por 1 turno.";
        case 6: return "Copia el efecto de otra carta en juego.";
        case 7: return "Ganas 2 puntos de vida.";
        case 8: return "Bloquea cartas de soporte y magia enemigas por 1 turno.";
        case 9: return "Revive una carta del cementerio al campo.";
        case 10: return "Robas 3 cartas.";
        case "J": return "Destruye cualquier carta en juego.";
        case "Q": return "Bloquea permanentemente una carta enemiga.";
        case "K": return "El oponente pierde 3 puntos de vida.";
        case "A": return "Juega otro turno inmediatamente.";
        default: return "";
    }
}
function descripcionCorazon(valor) {
    if (typeof valor === "number" && valor >= 2 && valor <= 9) return "Defensa básica.";
    switch(valor) {
        case 10: return "Refleja 1 punto de daño si sobrevive. Requiere sacrificio.";
        case "J": return "Protege todas tus cartas con valor menor a 6. Requiere sacrificio.";
        case "Q": return "Si es destruida, destruye automáticamente al atacante. Requiere sacrificio.";
        case "K": return "No puede ser destruida por cartas ♠ con valor menor a 9. Requiere sacrificio.";
        case "A": return "Efecto Revelación: al ser invocado, reduce a 0 el ataque de todas las cartas enemigas. Requiere sacrificio de 14 o campo completo.";
        default: return "";
    }
}

function descripcionEspada(valor) {
    if (typeof valor === "number" && valor >= 2 && valor <= 9) return "Ataque básico, igual a su número.";
    switch(valor) {
        case 10: return "Doble ataque: puede dividir su daño entre 2 objetivos. Requiere sacrificio.";
        case "J": return "Ignora defensas ♥ menores a 7. Requiere sacrificio.";
        case "Q": return "Si destruye una defensa, inflige 2 de daño extra al jugador. Requiere sacrificio.";
        case "K": return "Puede atacar 2 veces por turno. Requiere sacrificio.";
        case "A": return "Efecto Revelación: al ser invocado, destruye todas las cartas enemigas en ataque. Requiere sacrificio de 14 o campo completo (mínimo 3).";
        default: return "";
    }
}

function prepararInvocacion(idx) {
    let jugador = getJugadorActual();
    if(jugador.invocacionesEsteTurno >= jugador.limiteInvocacion) {
        mostrarMensaje("Ya invocaste el máximo de cartas este turno. Pasando a la siguiente fase...");
        setTimeout(() => {
            fase++;
            siguienteFase();
        }, 600);
        return;
    }
    cartaAInvocar = jugador.mano[idx];
    let valor = VALOR_NUM(cartaAInvocar.valor);
    let requiereSacrificio = valor>=10;
    if(!requiereSacrificio || jugador.puedeInvocarSinSacrificio) {
        if(jugador.puedeInvocarSinSacrificio) jugador.puedeInvocarSinSacrificio = false;
        invocarCarta(idx);
        return;
    }
    let area = document.getElementById("sacrificioArea");
    area.innerHTML = "<b>Selecciona cartas para sacrificar (sumar "+valor+"):</b><br>";
    sacrificiosSeleccionados = [];
    jugador.campo.forEach((carta,i)=>{
        let el = document.createElement("div");
        el.className = "carta";
        el.textContent = `${carta.simbolo} ${carta.valor}`;
        el.onclick = ()=>{
            if(sacrificiosSeleccionados.includes(i)) {
                sacrificiosSeleccionados = sacrificiosSeleccionados.filter(x=>x!==i);
                el.classList.remove("sacrificio");
            } else {
                sacrificiosSeleccionados.push(i);
                el.classList.add("sacrificio");
            }
            let suma = sacrificiosSeleccionados.reduce((acc,idx)=>acc+VALOR_NUM(jugador.campo[idx].valor),0);
            if(suma===valor) {
                area.innerHTML += "<br><button id='confirmarSacrificio'>Confirmar Sacrificio</button>";
                document.getElementById("confirmarSacrificio").onclick = ()=>invocarCarta(idx,true);
            }
        };
        area.appendChild(el);
    });
}

function invocarCarta(idx, conSacrificio=false) {
    let jugador = getJugadorActual();
    let carta = jugador.mano[idx];
    let valor = VALOR_NUM(carta.valor);
    if(valor>=10 && !conSacrificio && !jugador.puedeInvocarSinSacrificio) {
        mostrarMensaje("Debes sacrificar cartas para invocar esta carta.");
        return;
    }
    if(conSacrificio) {
        let suma = sacrificiosSeleccionados.reduce((acc,idx)=>acc+VALOR_NUM(jugador.campo[idx].valor),0);
        if(suma!==valor) {
            mostrarMensaje("La suma de sacrificios no es correcta.");
            return;
        }
        sacrificiosSeleccionados.sort((a,b)=>b-a).forEach(i=>{
            jugador.cementerio.push(jugador.campo[i]);
            jugador.campo.splice(i,1);
        });
    }
    jugador.campo.push(carta);
    jugador.mano.splice(idx,1);
    jugador.invocacionesEsteTurno++;
    cartaAInvocar = null;
    sacrificiosSeleccionados = [];
    document.getElementById("sacrificioArea").innerHTML = "";
    actualizarUI();
    if(jugador.invocacionesEsteTurno >= jugador.limiteInvocacion) {
        mostrarMensaje("Ya invocaste el máximo de cartas este turno. Pasando a la siguiente fase...");
        setTimeout(() => {
            fase++;
            siguienteFase();
        }, 600);
    }
}

function prepararAtaque() {
    let jugador = getJugadorActual();
    let campo = jugador.campo;
    let area = document.getElementById(turno===1 ? "campo1-ataque" : "campo2-ataque");
    let puedeAtacar = false;
    area.childNodes.forEach((el,idx)=>{
        let carta = campo.filter(c=>c.palo==="Espadas"||c.palo==="Corazones")[idx];
        if(carta && carta.palo==="Espadas" && !carta.yaAtaco) {
            puedeAtacar = true;
            el.classList.add("invocable");
            el.onclick = ()=>{ realizarAtaque(jugador.campo.indexOf(carta)); };
        }
    });
    if(!puedeAtacar) {
        fase++;
        setTimeout(siguienteFase, 400);
    }
}

function realizarAtaque(idx) {
    let jugador = getJugadorActual();
    let oponente = getOponente();
    let campo = jugador.campo;
    let area = document.getElementById(turno===1 ? "campo1-ataque" : "campo2-ataque");
    limpiarResaltados();
    area.childNodes.forEach(el => el.classList.remove("atacando"));
    if(area.childNodes[idx]) area.childNodes[idx].classList.add("atacando");
    let carta = campo[idx];
    let ataque = VALOR_NUM(carta.valor)+(carta.bonusAtk||0);
    carta.yaAtaco = true;

    // --- DEFENSA MANUAL ---
    if(!oponente.esIA) {
        forzarDefensa(jugador, oponente, carta, ataque);
        return;
    }

    // --- Efectos especiales de Espadas ---
    if (carta.palo === "Espadas") {
        switch (carta.valor) {
            case 10:
                if(!carta.dobleAtaco){
                    carta.dobleAtaco = true;
                    carta.yaAtaco = false;
                    mostrarMensaje("Selecciona el primer objetivo para el doble ataque.");
                    // Selección del primer objetivo
                    seleccionarObjetivoDobleAtaque(jugador, oponente, carta, ataque, (primerIdx, primerEsDirecto) => {
                        // Calcula el daño restante para el segundo ataque
                        let dañoRestante = ataque;
                        if (!primerEsDirecto && oponente.campo[primerIdx] && oponente.campo[primerIdx].palo === "Corazones") {
                            let defensa = oponente.campo[primerIdx];
                            let defValor = VALOR_NUM(defensa.valor)+(defensa.bonusDef||0);
                            dañoRestante = ataque - defValor;
                            if(dañoRestante < 0) dañoRestante = 0;
                        }
                        mostrarMensaje("Selecciona el segundo objetivo para el doble ataque.");
                        // Selección del segundo objetivo
                        seleccionarObjetivoDobleAtaque(jugador, oponente, carta, dañoRestante, (segundoIdx, segundoEsDirecto) => {
                            carta.yaAtaco = true;
                            carta.dobleAtaco = false;
                            // Primer ataque
                            if (primerEsDirecto) {
                                oponente.vida -= ataque;
                                mostrarMensaje(`Primer ataque directo de ${ataque} de daño.`);
                            } else {
                                ataqueEspada(jugador, oponente, carta, ataque, oponente.campo[primerIdx]);
                            }
                            // Segundo ataque
                            if (segundoEsDirecto) {
                                oponente.vida -= dañoRestante;
                                mostrarMensaje(`Segundo ataque directo de ${dañoRestante} de daño.`);
                            } else if (dañoRestante > 0 && oponente.campo[segundoIdx]) {
                                ataqueEspada(jugador, oponente, carta, dañoRestante, oponente.campo[segundoIdx]);
                            }
                            actualizarUI();
                            if(oponente.vida<=0) {
                                alert(`¡${jugador.nombre} gana!`);
                                resetGame();
                                return;
                            }
                            if (jugador.esIA) {
                                setTimeout(iaAtaque, 1500);
                            } else {
                                prepararAtaque();
                            }
                        }, true, primerIdx); // Evita seleccionar el mismo objetivo dos veces
                    });
                }
                break;
            case "J":
                let defensaJ = oponente.campo.find(c=>c.palo==="Corazones" && c.valor === "J");
                if(defensaJ && VALOR_NUM(carta.valor) < 6) {
                    mostrarMensaje("La defensa J protege todas tus cartas con valor menor a 6. Ataque bloqueado.");
                    return;
                }
                break;
            case "Q":
                let defensaQ = oponente.campo.find(c=>c.palo==="Corazones");
                if(defensaQ) {
                    let defValor = VALOR_NUM(defensaQ.valor)+(defensaQ.bonusDef||0);
                    if(ataque>defValor) {
                        oponente.cementerio.push(defensaQ);
                        oponente.campo = oponente.campo.filter(c=>c!==defensaQ);
                        oponente.vida -= (ataque-defValor)+2;
                        mostrarMensaje(`¡Destruiste una defensa y causaste ${ataque-defValor+2} de daño!`);
                    } else {
                        mostrarMensaje("El ataque fue bloqueado.");
                    }
                } else {
                    oponente.vida -= ataque;
                    mostrarMensaje(`¡Ataque directo de ${ataque} de daño!`);
                }
                break;
            case "K":
                if(!carta.dobleAtaco){
                    carta.dobleAtaco = true;
                    carta.yaAtaco = false;
                    mostrarMensaje("¡Esta carta puede atacar una vez más este turno! Selecciónala de nuevo para atacar.");
                    // Deja la carta lista para volver a atacar (no avances fase)
                    prepararAtaque();
                } else {
                    carta.yaAtaco = true;
                    carta.dobleAtaco = false;
                    ataqueEspada(jugador, oponente, carta, ataque);
                    // Después del segundo ataque, sigue el flujo normal
                }
                break;
            case "A":
                let destruidas = oponente.campo.filter(c=>c.palo==="Espadas");
                destruidas.forEach(c=>{
                    oponente.cementerio.push(c);
                });
                oponente.campo = oponente.campo.filter(c=>c.palo!=="Espadas");
                mostrarMensaje("¡Revelación! Destruyes todas las cartas de ataque enemigas.");
                break;
            default:
                ataqueEspada(jugador, oponente, carta, ataque);
        }
    }
    else if (carta.palo === "Diamantes") {
        if (carta.valor === "K") {
            oponente.vida -= 3;
            mostrarMensaje("El oponente pierde 3 puntos de vida.");
        } else if (carta.valor === "A") {
            jugador.turnoExtra = true;
            mostrarMensaje("¡Juegas otro turno inmediatamente!");
        }
    }
    else {
        ataqueEspada(jugador, oponente, carta, ataque);
    }

    if(oponente.vida<=0) {
        alert(`¡${jugador.nombre} gana!`);
        resetGame();
        return;
    }
    actualizarUI();
    if (jugador.esIA) {
        setTimeout(iaAtaque, 1500);
    } else {
        prepararAtaque();
    }
}

function ataqueEspada(jugador, oponente, carta, ataque, defensaForzada) {
    // Redirigir ataque si corresponde
    if(oponente.redirigirProxAtaque) {
        let defensas = oponente.campo.filter(c=>c.palo==="Corazones");
        if(defensas.length > 1 && !oponente.esIA) {
            mostrarMensaje("Selecciona a qué carta de defensa redirigir el ataque.");
            let areaCampo = document.getElementById(turno === 1 ? "campo2-ataque" : "campo1-ataque");
            areaCampo.childNodes.forEach((el,idx)=>{
                let cartaCampo = oponente.campo.filter(c=>c.palo==="Corazones")[idx];
                if(cartaCampo) {
                    el.classList.add("invocable");
                    el.onclick = () => {
                        areaCampo.childNodes.forEach(e => { e.onclick = null; e.classList.remove("invocable"); });
                        oponente.redirigirProxAtaque = false; // <-- Resetea aquí
                        ataqueEspada(jugador, oponente, carta, ataque, cartaCampo);
                    };
                }
            });
            return;
        } else {
            oponente.redirigirProxAtaque = false; // <-- Resetea si no hay opción
        }
    }

    let defensa = defensaForzada || oponente.campo.find(c=>c.palo==="Corazones");
    let defValor = defensa ? VALOR_NUM(defensa.valor)+(defensa.bonusDef||0) : 0;

    if(defensa) {
        resaltarCartaEnCampo(oponente, defensa, "defendiendo");
        mostrarMensaje(`${jugador.nombre} ataca con ${carta.simbolo} ${carta.valor} (${ataque}) y ${oponente.nombre} defiende con ${defensa.simbolo} ${defensa.valor} (${defValor}).`);
        switch(defensa.valor) {
            case 10:
                if(ataque>defValor) jugador.vida -= 1;
                // Efecto especial: 10 refleja 1 daño si sobrevive
                if(defensa.valor === 10 && ataque <= defValor) {
                    jugador.vida -= 1;
                    mostrarMensaje("¡La defensa 10 refleja 1 punto de daño al atacante!");
                }
                break;
            case "J":
                if(VALOR_NUM(carta.valor)<6) {
                    mostrarMensaje("La defensa J protege cartas menores a 6. Ataque bloqueado.");
                    return;
                }
                break;
            case "Q":
                if(ataque>defValor) {
                    jugador.cementerio.push(carta);
                    jugador.campo = jugador.campo.filter(c=>c!==carta);
                    mostrarMensaje("¡La defensa Q fue destruida y destruye la carta atacante!");
                }
                break;
            case "K":
                if(ataque<9) {
                    mostrarMensaje("La defensa K es inmune a ataques menores a 9.");
                    return;
                }
                break;
            case "A":
                carta.bonusAtk = -(VALOR_NUM(carta.valor));
                mostrarMensaje("¡Revelación! El ataque enemigo se reduce a 0 este turno.");
                break;
        }

        if(ataque>defValor) {
            oponente.cementerio.push(defensa);
            oponente.campo = oponente.campo.filter(c=>c!==defensa);
            oponente.vida -= (ataque-defValor);
            if(oponente.robarSiRecibeDanio) {
                oponente.robar(oponente.robarSiRecibeDanio);
                mostrarMensaje(`¡Robas ${oponente.robarSiRecibeDanio} cartas por efecto!`);
            }
            mostrarMensaje(`¡Destruiste la defensa y causaste ${ataque-defValor} de daño!`);
            setTimeout(() => {
                actualizarUI();
                fase++;
                siguienteFase();
            }, 1200);
            return;
        } else if (ataque < defValor) {
            jugador.cementerio.push(carta);
            jugador.campo = jugador.campo.filter(c=>c!==carta);
            mostrarMensaje("El ataque fue bloqueado y la carta atacante fue destruida.");
            setTimeout(() => {
                actualizarUI();
                fase++;
                siguienteFase();
            }, 1200);
            return;
        } else {
            // Empate: ambas destruidas
            oponente.cementerio.push(defensa);
            oponente.campo = oponente.campo.filter(c=>c!==defensa);
            jugador.cementerio.push(carta);
            jugador.campo = jugador.campo.filter(c=>c!==carta);
            mostrarMensaje("Empate: ambas cartas fueron destruidas.");
            setTimeout(() => {
                actualizarUI();
                fase++;
                siguienteFase();
            }, 1200);
            return;
        }
    } else {
        mostrarMensaje(`${jugador.nombre} ataca con ${carta.simbolo} ${carta.valor} (${ataque}) directamente. ¡Causa ${ataque} de daño!`);
        oponente.vida -= ataque;
    }
}

function resetGame() {
    mazoGlobal = crearBaraja().sort(()=>Math.random()-0.5);
    jugador1 = new Jugador("Jugador 1");
    jugador2 = new Jugador("Jugador 2", true); // <-- ¡IMPORTANTE!
    repartirMazo(jugador1, jugador2);
    turno = 1;
    fase = 0;
    primerTurno = true;
    sacrificiosSeleccionados = [];
    cartaAInvocar = null;
    jugador1.robar(5);
    jugador2.robar(5);
    actualizarUI();
    setTimeout(siguienteFase, 400); // Usa setTimeout para no bloquear la UI
}

let mazoGlobal = crearBaraja().sort(()=>Math.random()-0.5);

function repartirMazo(jugador1, jugador2) {
    jugador1.baraja = mazoGlobal.slice(0, 26);
    jugador2.baraja = mazoGlobal.slice(26, 52);
}

// Al final del archivo o después de definir todo:
resetGame();

document.getElementById("cementerio1").onclick = ()=>mostrarCementerioModal(jugador1);
document.getElementById("cementerio2").onclick = ()=>mostrarCementerioModal(jugador2);

function mostrarCementerioModal(jugador) {
    document.getElementById("modal-carta").style.display = "flex";
    let lista = jugador.cementerio.map((c, i) =>
        `<div style="margin:4px 0;cursor:pointer;" onclick="mostrarModalCartaDesdeCementerio(${jugador === jugador1 ? 1 : 2},${i})">${c.simbolo} ${c.valor} <span style="font-size:0.7em;">(${c.palo})</span></div>`
    ).join("");
    document.getElementById("modal-carta-contenido").innerHTML =
        `<b>Cementerio:</b><br>${lista}<br><button onclick="cerrarModalCarta()" style="margin-top:10px;padding:6px 18px;border-radius:8px;background:#00bfff;color:#fff;border:none;">Cerrar</button>`;
}
function cerrarCementerio() {
    document.getElementById("cementerio-modal").style.display = "none";
    document.getElementById("fondo-oscuro").style.display = "none";
}

function cerrarModalCarta() {
    document.getElementById("modal-carta").style.display = "none";
}

function iaInvocacion() {
    let jugador = jugador2;
    let invocados = 0;
    // Invoca hasta 3 cartas de valor <10 (sin sacrificio)
    for(let i=0; i<jugador.mano.length && invocados<3; i++) {
        let carta = jugador.mano[i];
        let valor = VALOR_NUM(carta.valor);
        if(valor < 10) {
            jugador.campo.push(carta);
            jugador.mano.splice(i,1);
            i--;
            invocados++;
            jugador.invocacionesEsteTurno++;
        }
    }
    // No invoca cartas que requieren sacrificio (IA simple)
    actualizarUI();
    setTimeout(() => {
        fase++;
        siguienteFase();
    }, 1200);
}

function iaAtaque() {
    let jugador = jugador2;
    let oponente = jugador1;
    let atacantes = jugador.campo.map((c,i)=>({carta:c,idx:i})).filter(x=>x.carta.palo==="Espadas" && !x.carta.yaAtaco);
    if(atacantes.length===0) {
        fase++;
        setTimeout(siguienteFase, 1200); // más lento
        return;
    }
    atacantes.sort((a,b)=>VALOR_NUM(b.carta.valor)-VALOR_NUM(a.carta.valor));
    setTimeout(() => {
        realizarAtaque(atacantes[0].idx);
    }, 1200); // delay entre ataques
}

function iaActivacion() {
    let jugador = jugador2;
    // Activa el primer trébol o diamante disponible
    let idx = jugador.campo.findIndex(c => (c.palo==="Tréboles"||c.palo==="Diamantes"));
    if(idx !== -1) {
        activarEfectoCampo(idx, jugador2);
        setTimeout(iaActivacion, 1200);
    } else {
        fase++;
        setTimeout(siguienteFase, 1200);
    }
}

function activarEfectoCampo(idx, jugadorForzado) {
    let jugador = jugadorForzado || getJugadorActual();
    let oponente = (jugador === jugador1) ? jugador2 : jugador1;
    let carta = jugador.campo[idx];
    let campoIdAtk = jugador === jugador1 ? "campo1-ataque" : "campo2-ataque";
    let campoIdApoyo = jugador === jugador1 ? "campo1-apoyo" : "campo2-apoyo";
    let campoAtk = document.getElementById(campoIdAtk);
    let campoApoyo = document.getElementById(campoIdApoyo);
    let campo = (["Tréboles","Diamantes"].includes(carta.palo)) ? campoApoyo : campoAtk;
    let mensaje = "";
    if(campo.childNodes[idx]) {
        campo.childNodes[idx].classList.add("magia");
        setTimeout(() => campo.childNodes[idx].classList.remove("magia"), 1200);
    }

    // --- Tréboles ---
    if (carta.palo === "Tréboles") {
        switch (carta.valor) {
            case 2:
                jugador.campo.forEach(c=>{
                    if(c.palo==="Corazones") c.bonusDef = (c.bonusDef||0)+2;
                });
                mensaje = "+2 defensa a todas las cartas de Corazones en tu campo este turno.";
                break;
            case 3:
                jugador.campo.forEach(c=>{
                    if(c.palo==="Espadas") c.bonusAtk = (c.bonusAtk||0)+2;
                });
                mensaje = "+2 ataque a todas las cartas de Espadas en tu campo este turno.";
                break;
            case 4:
                jugador.evitarProxAtaque = true;
                mensaje = "Evitarás el próximo ataque recibido.";
                break;
            case 5:
                jugador.vida += 2;
                mensaje = "Curas 2 puntos de vida.";
                break;
            case 6:
                jugador.redirigirProxAtaque = true;
                mensaje = "Podrás redirigir el próximo ataque a otra carta.";
                break;
            case 7:
                jugador.robarSiRecibeDanio = 2;
                jugador.robarSiRecibeDanioTurnos = 2;
                mensaje = "Si recibes daño hasta tu próximo turno, robas 2 cartas.";
                break;
            case 8:
                mostrarMensaje("Selecciona una carta en juego para anular su efecto.");
                ["campo1","campo2"].forEach((campoId, j) => {
                    let campo = document.getElementById(campoId);
                    let jugadorCampo = j === 0 ? jugador1 : jugador2;
                    campo.childNodes.forEach((el, i) => {
                        el.classList.add("invocable-trebol");
                        el.onclick = () => {
                            let cartaAnular = jugadorCampo.campo[i];
                            cartaAnular.efectoAnulado = true;
                            jugador.cementerio.push(carta);
                            jugador.campo.splice(idx,1);
                            actualizarUI();
                            mostrarMensaje(`El efecto de ${cartaAnular.simbolo} ${cartaAnular.valor} fue anulado por el 8 de trébol.`);
                            ["campo1","campo2"].forEach(cid=>{
                                let c = document.getElementById(cid);
                                c.childNodes.forEach(e=>{e.onclick=null; e.classList.remove("invocable-trebol");});
                            });
                        };
                    });
                });
                return;
            case 9:
                if(jugador.cementerio.length>0){
                    let cartaRec = jugador.cementerio.pop();
                    jugador.mano.push(cartaRec);
                    mensaje = "Recuperas una carta del cementerio a tu mano.";
                } else {
                    mensaje = "No hay cartas en el cementerio.";
                }
                break;
            case 10:
                jugador.campo.forEach(c=>{c.bonusAtk=0;c.bonusDef=0;});
                oponente.campo.forEach(c=>{c.bonusAtk=0;c.bonusDef=0;});
                mensaje = "Eliminas todos los efectos activos en el campo.";
                break;
            case "J":

                oponente.limiteInvocacion = 1;
                mensaje = "El oponente solo podrá invocar 1 carta en su próximo turno.";
                break;
            case "Q":
                jugador.puedeInvocarSinSacrificio = true;
                mensaje = "Puedes invocar una carta sin sacrificio este turno.";
                break;
            case "K":
                oponente.campo.forEach(c=>{
                    if(c.palo==="Espadas") c.bonusAtk = (c.bonusAtk||0)-2;
                });
                mensaje = "Reduces el ataque de todas las cartas enemigas en 2 puntos este turno.";
                break;
            case "A":
                jugador.puedeInvocarComoRespuesta = true;
                mensaje = "Podrás invocar una carta como respuesta a una acción enemiga.";
                break;
        }
        jugador.cementerio.push(carta);
        jugador.campo.splice(idx,1);
    }
    else if (carta.palo === "Diamantes") {
        switch (carta.valor) {
            case 2:
                jugador.robar();
                mensaje = "Robas 1 carta.";
                break;
            case 3:
                if(oponente.mano.length>0){
                    let rand = Math.floor(Math.random()*oponente.mano.length);
                    let desc = oponente.mano.splice(rand,1)[0];
                    oponente.cementerio.push(desc);
                    mensaje = "El oponente descarta 1 carta al azar.";
                } else {
                    mensaje = "El oponente no tiene cartas en la mano.";
                }
                break;
            case 4:
                mensaje = "Mano del oponente: " + oponente.mano.map(c=>`${c.simbolo} ${c.valor}`).join(", ");
                break;
            case 5:
                // Permite elegir una carta propia y asignarle un valor entre 2 y 14 (A)
                let cartasPropias = jugador.campo.filter(c=>c!==carta);
                if(cartasPropias.length > 0) {
                    mostrarMensaje("Haz clic en una de tus cartas para cambiar su valor por 1 turno.");
                    let campoIdAtk = jugador === jugador1 ? "campo1-ataque" : "campo2-ataque";
                    let campoIdApoyo = jugador === jugador1 ? "campo1-apoyo" : "campo2-apoyo";
                    let campoAtk = document.getElementById(campoIdAtk);
                    let campoApoyo = document.getElementById(campoIdApoyo);

                    // Recorre ambos campos
                    [campoAtk, campoApoyo].forEach(campo => {
                        Array.from(campo.childNodes).forEach((el) => {
                            // Busca la carta real asociada a este DOM node
                            let cartaCampo = Array.from(jugador.campo).find(c => {
                                if (campo === campoAtk && (c.palo === "Espadas" || c.palo === "Corazones") && c !== carta) return true;
                                if (campo === campoApoyo && (c.palo === "Tréboles" || c.palo === "Diamantes") && c !== carta) return true;
                                return false;
                            });
                            if(cartaCampo && cartasPropias.includes(cartaCampo)) {
                                el.classList.add("invocable");
                                el.onclick = () => {
                                    [campoAtk, campoApoyo].forEach(c => c.childNodes.forEach(e => { e.onclick = null; e.classList.remove("invocable"); }));
                                    // Pedir valor al usuario (si IA, elige aleatorio)
                                    let nuevoValor;
                                    if(jugador.esIA) {
                                        let posibles = [2,3,4,5,6,7,8,9,10,"J","Q","K","A"];
                                        nuevoValor = posibles[Math.floor(Math.random()*posibles.length)];
                                    } else {
                                        nuevoValor = prompt("Elige el nuevo valor para la carta (2-10, J, Q, K, A):", cartaCampo.valor);
                                    }
                                    if(nuevoValor) {
                                        if(!isNaN(nuevoValor)) nuevoValor = parseInt(nuevoValor);
                                        if(
                                            (typeof nuevoValor === "number" && nuevoValor >= 2 && nuevoValor <= 10) ||
                                            ["J","Q","K","A"].includes(nuevoValor)
                                        ) {
                                            cartaCampo.valorOriginal = cartaCampo.valor;
                                            cartaCampo.valor = nuevoValor;
                                            mensaje = `Cambiaste el valor de la carta a ${nuevoValor} por 1 turno.`;
                                        } else {
                                            mensaje = "Valor inválido. No se cambió la carta.";
                                        }
                                    } else {
                                        mensaje = "No se cambió el valor de la carta.";
                                    }
                                    jugador.cementerio.push(carta);
                                    jugador.campo.splice(jugador.campo.indexOf(carta),1);
                                    actualizarUI();
                                    mostrarMensaje(`Efecto activado: ${mensaje}`);
                                };
                            }
                        });
                    });
                    return;
                } else {
                    mensaje = "No tienes otra carta para cambiar su valor.";
                }
                break;
            case 6:
                mostrarMensaje("Haz clic en una carta en juego para copiar su efecto.");
                ["campo1","campo2"].forEach((campoId, j) => {
                    let campo = document.getElementById(campoId);
                    let jugadorCampo = j === 0 ? jugador1 : jugador2;
                    campo.childNodes.forEach((el, i) => {
                        el.classList.add("invocable");
                        el.onclick = () => {
                            let cartaACopiar = jugadorCampo.campo[i];
                            carta.efecto = cartaACopiar.efecto;
                            mensaje = `Copiaste el efecto de ${cartaACopiar.simbolo} ${cartaACopiar.valor}: ${cartaACopiar.efecto}`;
                            jugador.cementerio.push(carta);
                            jugador.campo.splice(idx,1);
                            actualizarUI();
                            mostrarMensaje(`Efecto activado: ${mensaje}`);
                            ["campo1","campo2"].forEach(cid=>{
                                let c = document.getElementById(cid);
                                c.childNodes.forEach(e=>{e.onclick=null; e.classList.remove("invocable");});
                            });
                        };
                    });
                });
                return;
            case 7:
                jugador.vida += 2;
                mensaje = "Ganas 2 puntos de vida.";
                break;
            case 8:
                oponente.bloqueaSoporteMagia = true;
                oponente.turnosBloqueoSoporteMagia = 1;
                mensaje = "El oponente no podrá usar cartas de soporte ni magia en su próximo turno.";
                break;
            case 9:
                if(jugador.cementerio.length>0){
                    let cartaRevive = jugador.cementerio.pop();
                    jugador.campo.push(cartaRevive);
                    mensaje = "Revives una carta del cementerio al campo.";
                } else {
                    mensaje = "No hay cartas en el cementerio.";
                }
                break;
            case 10:
                jugador.robar(3);
                mensaje = "Robas 3 cartas.";
                break;
            case "J":
                if(oponente.campo.length>0){
                    let idxDes = Math.floor(Math.random()*oponente.campo.length);
                    let cartaDes = oponente.campo.splice(idxDes,1)[0];
                    oponente.cementerio.push(cartaDes);
                    mensaje = `Destruyes la carta ${cartaDes.simbolo} ${cartaDes.valor} del oponente.`;
                } else {
                    mensaje = "No hay cartas en el campo enemigo.";
                }
                break;
            case "Q":
                if(oponente.campo.length>0){
                    mostrarMensaje("Haz clic en la carta del campo rival que quieres bloquear permanentemente.");
                    let campoRival = document.getElementById(turno === 1 ? "campo2" : "campo1");
                    campoRival.childNodes.forEach((el, i) => {
                        el.classList.add("invocable");
                        el.onclick = () => {
                            let cartaBloq = oponente.campo[i];
                            cartaBloq.bloqueada = true;
                            jugador.cementerio.push(carta);
                            jugador.campo.splice(idx,1);
                            actualizarUI();
                            mostrarMensaje(`Bloqueaste permanentemente la carta ${cartaBloq.simbolo} ${cartaBloq.valor} del oponente.`);
                            campoRival.childNodes.forEach(e => { e.onclick = null; e.classList.remove("invocable"); });
                        };
                    });
                    return;
                } else {
                    mensaje = "No hay cartas en el campo enemigo.";
                }
                break;
            case "K":
                oponente.vida -= 3;
                mensaje = "El oponente pierde 3 puntos de vida.";
                break;
            case "A":
                jugador.turnoExtra = true;
                mensaje = "¡Juegas otro turno inmediatamente!";
                break;
        }
        jugador.cementerio.push(carta);
        jugador.campo.splice(idx,1);
    }
    actualizarUI();
    mostrarMensaje(`Efecto activado: ${mensaje}`);
}

function resaltarCartaEnCampo(jugador, carta, clase) {
    let campoIdAtk = jugador === jugador1 ? "campo1-ataque" : "campo2-ataque";
    let campoIdApoyo = jugador === jugador1 ? "campo1-apoyo" : "campo2-apoyo";
    let campoAtk = document.getElementById(campoIdAtk);
    let campoApoyo = document.getElementById(campoIdApoyo);
    let idx = jugador.campo.indexOf(carta);
    let el = null;
    if (["Espadas","Corazones"].includes(carta.palo)) {
        el = campoAtk.childNodes[idx];
    } else {
        el = campoApoyo.childNodes[idx];
    }
    if(el) {
        el.classList.add(clase);
        setTimeout(() => el.classList.remove(clase), 1200);
    }
}

function mostrarMensaje(texto) {
    const mensajeDiv = document.getElementById("mensaje");
    mensajeDiv.textContent = texto;
    mensajeDiv.style.opacity = 1;
    setTimeout(() => {
        mensajeDiv.style.opacity = 0.9;
    }, 1800);
}

function limpiarResaltados() {
    document.querySelectorAll('.carta.atacando, .carta.defendiendo, .carta.magia').forEach(el => {
        el.classList.remove('atacando', 'defendiendo', 'magia');
    });
}

function forzarDefensa(jugador, oponente, carta, ataque) {
    let defensas = oponente.campo.filter(c=>c.palo==="Corazones");
    let trebolesDisponibles = oponente.mano.filter(c=>c.palo==="Tréboles" && VALOR_NUM(c.valor) <= 7);
    if(!oponente.esIA && (defensas.length > 0 || trebolesDisponibles.length > 0)) {
        document.getElementById("mensaje").textContent = "Elige una carta de Corazones para defender, activa un Trébol rápido o pulsa 'Pasar'.";
        let areaCampo = document.getElementById(turno === 1 ? "campo2-ataque" : "campo1-ataque");
        // Marcar defensas como seleccionables
        areaCampo.childNodes.forEach((el,idx)=>{
            let cartaCampo = oponente.campo[idx];
            if(cartaCampo && cartaCampo.palo==="Corazones") {
                el.classList.add("invocable");
                el.onclick = () => {
                    // Limpia handlers y resaltados
                    areaCampo.childNodes.forEach(e => { e.onclick = null; e.classList.remove("invocable"); });
                    let areaMano = document.getElementById(turno === 1 ? "mano2" : "mano1");
                    areaMano.childNodes.forEach(e => { e.onclick = null; e.classList.remove("invocable-trebol"); });
                    let btnPasar = document.getElementById("btnPasarDefensa");
                    if(btnPasar) btnPasar.remove();
                    // Lógica de defensa forzada
                    let defensa = cartaCampo;
                    let defValor = VALOR_NUM(defensa.valor)+(defensa.bonusDef||0);
                    resaltarCartaEnCampo(oponente, defensa, "defendiendo");
                    mostrarMensaje(`${jugador.nombre} ataca con ${carta.simbolo} ${carta.valor} (${ataque}) y ${oponente.nombre} defiende con ${defensa.simbolo} ${defensa.valor} (${defValor}).`);
                    switch(defensa.valor) {
                        case 10:
                            if(ataque>defValor) jugador.vida -= 1;
                            // Efecto especial: 10 refleja 1 daño si sobrevive
                            if(defensa.valor === 10 && ataque <= defValor) {
                                jugador.vida -= 1;
                                mostrarMensaje("¡La defensa 10 refleja 1 punto de daño al atacante!");
                            }
                            break;
                        case "J":
                            if(VALOR_NUM(carta.valor)<6) {
                                mostrarMensaje("La defensa J protege cartas menores a 6. Ataque bloqueado.");
                                return;
                        }
                        break;
                        case "Q":
                            if(ataque>defValor) {
                                jugador.cementerio.push(carta);
                                jugador.campo = jugador.campo.filter(c=>c!==carta);
                                mostrarMensaje("¡La defensa Q fue destruida y destruye la carta atacante!");
                            }
                            break;
                        case "K":
                            if(ataque<9) {
                                mostrarMensaje("La defensa K es inmune a ataques menores a 9.");
                                return;
                        }
                        break;
                        case "A":
                            carta.bonusAtk = -(VALOR_NUM(carta.valor));
                            mostrarMensaje("¡Revelación! El ataque enemigo se reduce a 0 este turno.");
                            break;
                    }

                    if(ataque>defValor) {
                        oponente.cementerio.push(defensa);
                        oponente.campo = oponente.campo.filter(c=>c!==defensa);
                        oponente.vida -= (ataque-defValor);
                        if(oponente.robarSiRecibeDanio) {
                            oponente.robar(oponente.robarSiRecibeDanio);
                            mostrarMensaje(`¡Robas ${oponente.robarSiRecibeDanio} cartas por efecto!`);
                        }
                        mostrarMensaje(`¡Destruiste la defensa y causaste ${ataque-defValor} de daño!`);
                        setTimeout(() => {
                            actualizarUI();
                            fase++;
                            siguienteFase();
                        }, 1200);
                        return;
                    } else if (ataque < defValor) {
                        jugador.cementerio.push(carta);
                        jugador.campo = jugador.campo.filter(c=>c!==carta);
                        mostrarMensaje("El ataque fue bloqueado y la carta atacante fue destruida.");
                        setTimeout(() => {
                            actualizarUI();
                            fase++;
                            siguienteFase();
                        }, 1200);
                        return;
                    } else {
                        // Empate: ambas destruidas
                        oponente.cementerio.push(defensa);
                        oponente.campo = oponente.campo.filter(c=>c!==defensa);
                        jugador.cementerio.push(carta);
                        jugador.campo = jugador.campo.filter(c=>c!==carta);
                        mostrarMensaje("Empate: ambas cartas fueron destruidas.");
                        setTimeout(() => {
                            actualizarUI();
                            fase++;
                            siguienteFase();
                        }, 1200);
                        return;
                    }
                };
            }
        });
        // Aquí puedes agregar lógica para activar tréboles rápidos si lo deseas
    }
}

function mostrarModalCarta(carta) {
    let contenido = `<div style="font-size:1.5em;margin-bottom:8px;">${carta.simbolo} ${carta.valor} <span style="font-size:0.7em;">(${carta.palo})</span></div>`;
    if (carta.efecto && carta.efecto.length > 0) {
        contenido += `<div style="margin-bottom:8px;">${carta.efecto}</div>`;
    }
    if (carta.valorOriginal) {
        contenido += `<div style="color:#ffb347;">Valor original: ${carta.valorOriginal}</div>`;
    }
    document.getElementById("modal-carta-contenido").innerHTML = contenido;
    document.getElementById("modal-carta").style.display = "flex";
}

function mostrarModalCartaMano(carta, idx, jugador) {
    let puedeInvocar = (turno === (jugador === jugador1 ? 1 : 2)) && fase === 1 && !jugador.esIA;
    let contenido = `<div style="font-size:1.5em;margin-bottom:8px;">${carta.simbolo} ${carta.valor} <span style="font-size:0.7em;">(${carta.palo})</span></div>`;
    if (carta.efecto && carta.efecto.length > 0) {
        contenido += `<div style="margin-bottom:8px;">${carta.efecto}</div>`;
    }
    if (carta.valorOriginal) {
        contenido += `<div style="color:#ffb347;">Valor original: ${carta.valorOriginal}</div>`;
    }
    if (puedeInvocar) {
        contenido += `<button id="btnInvocarCarta" style="margin-top:10px;padding:6px 18px;border-radius:8px;background:#00bfff;color:#fff;border:none;">Invocar</button>`;
    }
    document.getElementById("modal-carta-contenido").innerHTML = contenido;
    document.getElementById("modal-carta").style.display = "flex";
    if (puedeInvocar) {
        document.getElementById("btnInvocarCarta").onclick = () => {
            cerrarModalCarta();
            prepararInvocacion(idx);
        };
    }
}

function mostrarModalCartaDesdeCementerio(jugadorNum, idx) {
    let jugador = jugadorNum === 1 ? jugador1 : jugador2;
    let carta = jugador.cementerio[idx];
    mostrarModalCarta(carta);
}

window.onclick = function(event) {
    let modal = document.getElementById("modal-carta");
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

function prepararSacrificio(valorObjetivo) {
    mostrarMensaje(`Selecciona cartas de tu campo para sacrificar (sumar ${valorObjetivo}):`);
    let jugador = getJugadorActual();
    let seleccionadas = [];
    let suma = 0;

    // Limpia eventos previos
    mostrarCampo();

    // Resalta y agrega eventos a cartas del campo
    jugador.campo.forEach((carta, idx) => {
        let areaCampo = document.getElementById(turno === 1 ? "campo1-ataque" : "campo2-ataque");
        let el = areaCampo.childNodes[idx];
        if (el) {
            el.classList.add("sacrificio");
            el.onclick = () => {
                if (!seleccionadas.includes(idx)) {
                    seleccionadas.push(idx);
                    suma += VALOR_NUM(carta.valor);
                    el.classList.add("seleccionada");
                } else {
                    seleccionadas = seleccionadas.filter(i => i !== idx);
                    suma -= VALOR_NUM(carta.valor);
                    el.classList.remove("seleccionada");
                }
                if (suma === valorObjetivo) {
                    // Realiza el sacrificio
                    let sacrificios = seleccionadas.map(i => jugador.campo[i]);
                    // ...tu lógica de sacrificio aquí...
                    limpiarResaltados();
                    actualizarUI();
                }
            };
        }
    });
}

