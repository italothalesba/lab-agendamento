import React, { useState, useEffect, useCallback } from 'react';

// --- CONFIGURAÇÕES GERAIS ---
const LOCAL_STORAGE_KEY = 'labBookingsV2';
const MASTER_PASSWORD = 'MeuCunhadoEFoda';

// --- COMPONENTE DA TABELA DE VISÃO GERAL (Calendário) ---
// Este componente é "burro", apenas renderiza os dados que recebe.
const FullScheduleTable = ({ equipment, days, shifts, bookings, onCellClick }) => {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th scope="col" className="sticky left-0 bg-gray-100 px-3 py-3 text-left font-bold text-gray-700 uppercase tracking-wider z-10">
              Equipamento
            </th>
            {days.map(day => (
              <th key={day} colSpan={shifts.length} className="px-3 py-3 text-center font-bold text-gray-700 uppercase tracking-wider border-l border-gray-200">
                {day}
              </th>
            ))}
          </tr>
          <tr>
            <th scope="col" className="sticky left-0 bg-gray-100 px-3 py-3 z-10"></th>
            {days.map(day =>
              shifts.map(shift => (
                <th key={`${day}-${shift}`} scope="col" className="px-1 py-3 text-center font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                  {shift.substring(0, 3)}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {equipment.map((equip, equipIndex) => (
            <tr key={equip} className="hover:bg-gray-50">
              <td className="sticky left-0 px-3 py-4 whitespace-nowrap font-medium text-gray-900 bg-white hover:bg-gray-50 z-10">
                {equip}
              </td>
              {days.map(day =>
                shifts.map(shift => {
                  const timeSlotId = `${equip}-${day}-${shift}`;
                  const bookingInfo = bookings[timeSlotId];
                  return (
                    <td
                      key={timeSlotId}
                      onClick={() => onCellClick(equip, day, shift, bookingInfo)}
                      className={`px-2 py-4 text-center whitespace-nowrap border-l border-gray-200 cursor-pointer transition-colors duration-200 ${
                        bookingInfo
                          ? 'bg-red-50 text-red-700 font-semibold'
                          : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {bookingInfo ? bookingInfo.studentName.split(' ')[0] : 'Livre'}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
function App() {
  // --- ESTADOS (DATA) ---
  const [equipment] = useState([
    "Silva (S)", "Lafferty (L)", "Takemoto (T)",
    "Moravec (M)", "Kritsky (K)", "Microscopio Leica",
    "Microscopio Zeiss", "PC 01", "PC 02"
  ]);
  const [days] = useState(["Seg", "Ter", "Qua", "Qui", "Sex"]);
  const [shifts] = useState(["Manhã", "Tarde", "Noite"]);
  const [bookings, setBookings] = useState({});

  // --- ESTADOS (UI) ---
  const [selectedEquipment, setSelectedEquipment] = useState(equipment[0]);
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [modal, setModal] = useState({ type: null, data: null, message: '' });

  // --- HOOKS DE EFEITO (localStorage) ---
  useEffect(() => {
    try {
      const storedBookings = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedBookings) setBookings(JSON.parse(storedBookings));
    } catch (error) { console.error("Erro ao carregar dados:", error); }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bookings));
    } catch (error) { console.error("Erro ao salvar dados:", error); }
  }, [bookings]);

  // --- FUNÇÕES DE LÓGICA ---
  const handleSlotClick = (shift) => {
    const timeSlotId = `${selectedEquipment}-${selectedDay}-${shift}`;
    const existingBooking = bookings[timeSlotId];
    if (existingBooking) setModal({ type: 'unbookConfirm', data: { timeSlotId, booking: existingBooking } });
    else setModal({ type: 'bookInput', data: { shift } });
  };
  
  const handleTableCellClick = (equip, day, shift, bookingInfo) => {
      let message;
      if (bookingInfo) {
          message = `O equipamento "${equip}" está agendado para ${bookingInfo.studentName} no período da ${shift} de ${day}.`;
      } else {
          message = `O equipamento "${equip}" está livre no período da ${shift} de ${day}. Use os seletores acima para agendar.`;
      }
      setModal({ type: 'slotInfo', message: message });
  };

  const performBooking = (studentName, password) => {
    if (!studentName?.trim() || !password?.trim()) {
      setModal({ type: 'info', message: 'Nome e senha são obrigatórios.' }); return;
    }
    const { shift } = modal.data;
    const timeSlotId = `${selectedEquipment}-${selectedDay}-${shift}`;
    setBookings(prev => ({ ...prev, [timeSlotId]: { studentName: studentName.trim(), password: password.trim() } }));
    setModal({ type: 'info', message: 'Agendamento realizado com sucesso!' });
  };

  const performUnbooking = (passwordAttempt) => {
    const { timeSlotId, booking } = modal.data;
    if (passwordAttempt === booking.password || passwordAttempt === MASTER_PASSWORD) {
      const newBookings = { ...bookings };
      delete newBookings[timeSlotId];
      setBookings(newBookings);
      setModal({ type: 'info', message: 'Agendamento removido com sucesso.' });
    } else {
      setModal({ type: 'info', message: 'Senha incorreta. Apenas quem agendou ou um administrador pode desmarcar.' });
    }
  };

  const requestResetConfirmation = () => setModal({ type: 'resetConfirm' });

  const performReset = useCallback((passwordAttempt) => {
    if (passwordAttempt === MASTER_PASSWORD) {
      setBookings({});
      setModal({ type: 'info', message: 'Todos os agendamentos foram resetados com sucesso!' });
    } else {
      setModal({ type: 'info', message: 'Senha de administrador incorreta. Operação cancelada.' });
    }
  }, []);

  const closeModal = () => setModal({ type: null, data: null, message: '' });

  // --- COMPONENTES DE MODAL E RENDERIZAÇÃO ---
  const ModalRenderer = () => { /* ...código do ModalRenderer permanece idêntico... */ 
    if (!modal.type) return null;
    const baseModalClass = "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4";
    const modalContentClass = "bg-white rounded-xl shadow-2xl p-6 w-full max-w-md text-center transform transition-all";
    let nameInput, passInput, passAttemptInput = '';

    const InfoModal = ({ title, children }) => (
      <div className={baseModalClass} onClick={closeModal}>
        <div className={modalContentClass} onClick={e => e.stopPropagation()}>
          <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
          <p className="text-gray-600 mb-6">{modal.message || children}</p>
          <button onClick={closeModal} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg">OK</button>
        </div>
      </div>
    );
    
    switch (modal.type) {
      case 'info': return <InfoModal title="Aviso" />;
      case 'slotInfo': return <InfoModal title="Detalhes do Horário" />;
      
      case 'bookInput': return (
        <div className={baseModalClass}>
          <div className={modalContentClass}>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Agendar Horário</h3>
            <p className="text-gray-600 mb-4">Agendando <span className="font-semibold">{selectedEquipment}</span> para <span className="font-semibold">{selectedDay}, {modal.data.shift}</span>.</p>
            <input type="text" placeholder="Seu nome completo" autoFocus onChange={e => nameInput = e.target.value} className="w-full p-3 border rounded-lg mb-3" />
            <input type="password" placeholder="Crie uma senha para desmarcar" onChange={e => passInput = e.target.value} className="w-full p-3 border rounded-lg mb-6" />
            <div className="flex justify-center gap-4">
              <button onClick={() => performBooking(nameInput, passInput)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg">Confirmar</button>
              <button onClick={closeModal} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      );
      case 'unbookConfirm': return (
        <div className={baseModalClass}>
          <div className={modalContentClass}>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Desmarcar Horário</h3>
            <p className="text-gray-600 mb-4">Para desmarcar o horário de <span className="font-semibold">{modal.data.booking.studentName}</span>, digite a senha.</p>
            <input type="password" placeholder="Senha do agendamento ou mestre" autoFocus onChange={e => passAttemptInput = e.target.value} className="w-full p-3 border rounded-lg mb-6" />
            <div className="flex justify-center gap-4">
              <button onClick={() => performUnbooking(passAttemptInput)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg">Desmarcar</button>
              <button onClick={closeModal} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      );
      case 'resetConfirm': return (
        <div className={baseModalClass}>
          <div className={modalContentClass}>
            <h3 className="text-xl font-bold text-red-600 mb-2">Resetar Todos Agendamentos</h3>
            <p className="text-gray-600 mb-4">Ação irreversível. Digite a senha de administrador para continuar.</p>
            <input type="password" placeholder="Senha de Administrador" autoFocus onChange={e => passAttemptInput = e.target.value} className="w-full p-3 border rounded-lg mb-6" />
            <div className="flex justify-center gap-4">
              <button onClick={() => performReset(passAttemptInput)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">Resetar Tudo</button>
              <button onClick={closeModal} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg">Cancelar</button>
            </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-inter">
      <ModalRenderer />
      
      <header className="w-full max-w-7xl mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-800">Sistema de Agendamento</h1>
        <p className="text-gray-500 mt-2">LABEPii</p>
      </header>

      {/* --- Seção de Ações (Agendar/Desmarcar) --- */}
      <section className="w-full max-w-2xl bg-white shadow-xl rounded-lg p-6 mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Agendar um Horário</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="equipment-select" className="block text-sm font-medium text-gray-700 mb-1">1. Escolha o Equipamento:</label>
            <select id="equipment-select" value={selectedEquipment} onChange={e => setSelectedEquipment(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
              {equipment.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="day-select" className="block text-sm font-medium text-gray-700 mb-1">2. Escolha o Dia:</label>
            <select id="day-select" value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
              {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-6 pt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">3. Escolha o Turno:</h3>
          <ul className="space-y-3">
            {shifts.map(shift => {
              const timeSlotId = `${selectedEquipment}-${selectedDay}-${shift}`;
              const bookingInfo = bookings[timeSlotId];
              return (
                <li key={shift} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg shadow-sm">
                  <div>
                     <span className="font-semibold text-gray-800">{shift}</span>
                     {bookingInfo && <span className="text-sm text-gray-500">Agendado por: {bookingInfo.studentName}</span>}
                  </div>
                  <button onClick={() => handleSlotClick(shift)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-transform transform hover:scale-105 ${bookingInfo ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900' : 'bg-green-500 hover:bg-green-600 text-white'}`}>
                    {bookingInfo ? 'Gerenciar' : 'Agendar'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* --- Seção de Visão Geral (Calendário) --- */}
      <section className="w-full max-w-7xl bg-white shadow-xl rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Visão Geral da Semana</h2>
          <FullScheduleTable
              equipment={equipment}
              days={days}
              shifts={shifts}
              bookings={bookings}
              onCellClick={handleTableCellClick}
          />
      </section>

      <footer className="mt-12">
        <button onClick={requestResetConfirmation} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-lg shadow-md hover:shadow-lg">
          Resetar Todos os Agendamentos
        </button>
      </footer>
    </div>
  );
}

export default App;