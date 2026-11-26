const section = document.querySelector('.inspection')
const stage = section.querySelector('.inspection-stage')
const points = section.querySelector('.inspection-points')
const detail = section.querySelector('.inspection-detail')
const parts = {
  all: [50,50,1,'El conjunto','La tela se enrolla sobre un tubo sostenido en sus extremos. Elegí una pieza para acercarte.'],
  support: [22,40,2.12,'Soporte','Sujeta uno de los extremos del tubo y lo mantiene alineado al instalar la cortina.'],
  axis: [48,38,1.72,'Tubo','Es el eje donde se enrolla la tela. Gira cuando se acciona el comando.'],
  drive: [68,36,2.18,'Comando','Recibe el movimiento de la cadena y lo transmite al tubo para subir o bajar la tela.'],
  fabric: [47,63,1.72,'Tela','Es la superficie que cubre el vano. Su material determina cuánta luz atraviesa el conjunto.'],
  rail: [47,86,1.75,'Zócalo','Da peso y estabilidad al borde inferior para que la tela baje pareja.']
}
const buttons = [...section.querySelectorAll('[data-part]')]
buttons.forEach(button => {
  const [x,y] = parts[button.dataset.part]
  button.style.setProperty('--x', x+'%')
  button.style.setProperty('--y', y+'%')
  button.addEventListener('click', () => show(button.dataset.part))
})
function show(key){
  const [x,y,scale,title,copy]=parts[key]
  stage.style.setProperty('--px', x+'%')
  stage.style.setProperty('--py', y+'%')
  stage.style.setProperty('--scale', scale)
  stage.toggleAttribute('data-focused', key!=='all')
  buttons.forEach(el=>el.setAttribute('aria-pressed', String(el.dataset.part===key)))
  detail.querySelector('h3').textContent=title
  detail.querySelector('p').textContent=copy
}
section.addEventListener('keydown', event => {
  if (event.key === 'Escape') show('all')
})
