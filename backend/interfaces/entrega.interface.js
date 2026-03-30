class Entrega {
  constructor(id, empleadoId, eppId, fechaEntrega, cantidad) {
    this.id = id
    this.empleadoId = empleadoId
    this.eppId = eppId
    this.fechaEntrega = fechaEntrega
    this.cantidad = cantidad
  }
}

module.exports = Entrega