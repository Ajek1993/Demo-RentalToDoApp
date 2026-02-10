export function AssignmentHistory({ assignments, currentUserId }) {
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

  if (!assignments || assignments.length === 0) {
    return null
  }

  // Filtruj tylko aktywnych
  const activeAssignments = assignments.filter(a => a.unassigned_at === null)
  const unassignedAssignments = assignments.filter(a => a.unassigned_at !== null)

  return (
    <div className="assignment-history">
      <h4>Przypisani:</h4>
      <ul>
        {activeAssignments.map((assignment, index) => (
          <li
            key={assignment.id}
            className={assignment.user_id === currentUserId ? 'current-user' : ''}
          >
            <span className="assignment-name">
              {assignment.user_profile?.name || 'Nieznany'}
            </span>
            <span className="assignment-time">
              {formatTimestamp(assignment.assigned_at)}
            </span>
            {index === 0 && (
              <span className="first-badge">Pierwszy</span>
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
                <span className="assignment-time">
                  {formatTimestamp(assignment.assigned_at)} - {formatTimestamp(assignment.unassigned_at)}
                </span>
              </li>
            ))}
          </>
        )}
      </ul>
    </div>
  )
}
