const FIELD_LABELS = {
  plate: 'Nr rej.',
  date: 'Data',
  time: 'Godzina',
  location: 'Lokalizacja',
  notes: 'Notatki',
  insurance_company: 'Ubezpieczyciel',
  is_one_way: 'Kurs jednostronny'
}

const formatValue = (field, val) => {
  if (field === 'is_one_way') return val === 'true' ? 'Tak' : 'Nie'
  return val || '(puste)'
}

export function AssignmentHistory({ assignments, currentUserId, edits, onUnassignOther, orderId, isOnline }) {
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(',', '')
  }

  const hasAssignments = assignments && assignments.length > 0
  const hasEdits = edits && edits.length > 0

  if (!hasAssignments && !hasEdits) {
    return null
  }

  // Filtruj tylko aktywnych
  const activeAssignments = (assignments || []).filter(a => a.unassigned_at === null)
  const unassignedAssignments = (assignments || []).filter(a => a.unassigned_at !== null)

  return (
    <div className="assignment-history">
      {hasAssignments && (
        <>
          <h3>Przypisani:</h3>
          <ul>
            {activeAssignments.map((assignment, index) => (
              <li
                key={assignment.id}
                className={assignment.user_id === currentUserId ? 'current-user' : ''}
              >
                <span className="assignment-name">
                  {assignment.user_profile?.name || 'Nieznany'}
                </span>
                {assignment.assigned_by &&
                 assignment.assigned_by !== assignment.user_id &&
                 assignment.assigned_by_profile && (
                  <span className="assigned-by-info">
                    (przypisany przez {assignment.assigned_by_profile.name})
                  </span>
                )}
                <span className="assignment-time">
                  {formatTimestamp(assignment.assigned_at)}
                </span>
                {index === 0 && (
                  <span className="first-badge">Pierwszy</span>
                )}
                {onUnassignOther && assignment.user_id !== currentUserId && (
                  <button
                    className="btn-unassign-other"
                    onClick={() => onUnassignOther(assignment.user_id, assignment.user_profile?.name || 'Nieznany')}
                    disabled={!isOnline}
                    title={`Wypisz ${assignment.user_profile?.name || 'Nieznany'}`}
                    aria-label={`Wypisz ${assignment.user_profile?.name || 'Nieznany'} z tego zlecenia`}
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
            {unassignedAssignments.length > 0 && (
              <>
                <li className="history-divider">
                  <span>Wypisani:</span>
                </li>
                {unassignedAssignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="unassigned"
                  >
                    <span className="assignment-name">
                      {assignment.user_profile?.name || 'Nieznany'}
                    </span>
                    {assignment.assigned_by &&
                     assignment.assigned_by !== assignment.user_id &&
                     assignment.assigned_by_profile && (
                      <span className="assigned-by-info">
                        (przypisany przez {assignment.assigned_by_profile.name})
                      </span>
                    )}
                    {assignment.unassigned_by &&
                     assignment.unassigned_by !== assignment.user_id &&
                     assignment.unassigned_by_profile && (
                      <span className="unassigned-by-info">
                        (wypisany przez {assignment.unassigned_by_profile.name})
                      </span>
                    )}
                    <span className="assignment-time">
                      {formatTimestamp(assignment.assigned_at)} - {formatTimestamp(assignment.unassigned_at)}
                    </span>
                  </li>
                ))}
              </>
            )}
          </ul>
        </>
      )}

      {hasEdits && (
        <div className="edit-history-section">
          <h3>Edycje:</h3>
          {edits.map((edit) => (
            <div key={edit.id} className="edit-history-item">
              <div className="edit-history-header">
                <span className="assignment-name">
                  {edit.edited_by_profile?.name || 'Nieznany'}
                </span>
                <span className="assignment-time">
                  {formatTimestamp(edit.edited_at)}
                </span>
              </div>
              <div className="edit-changes">
                {Object.entries(edit.changes).map(([field, [oldVal, newVal]]) => (
                  <div key={field} className="edit-change">
                    <span className="edit-field-label">{FIELD_LABELS[field] || field}:</span>
                    <span className="edit-old-value">{formatValue(field, oldVal)}</span>
                    <span className="edit-arrow">&rarr;</span>
                    <span className="edit-new-value">{formatValue(field, newVal)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
