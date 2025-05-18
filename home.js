document.addEventListener('DOMContentLoaded', () => {
  fetch('https://hogar247-backend.onrender.com/api/inmuebles')
    .then(response => response.json())
    .then(data => mostrarInmuebles(data))
    .catch(error => console.error('Error al obtener inmuebles:', error));
});

function mostrarInmuebles(inmuebles) {
  const contenedor = document.getElementById('lista-inmuebles');
  contenedor.innerHTML = '';

  inmuebles.forEach(inmueble => {
    const div = document.createElement('div');
    div.className = 'inmueble';
    div.innerHTML = `
      <h3>${inmueble.titulo}</h3>
      <p><strong>Tipo:</strong> ${inmueble.tipo}</p>
      <p><strong>Precio:</strong> $${inmueble.precio}</p>
      <p><strong>Ubicación:</strong> ${inmueble.ubicacion}</p>
      <p><strong>Disponible:</strong> ${inmueble.disponible ? 'Sí' : 'No'}</p>
    `;
    contenedor.appendChild(div);
  });
}
