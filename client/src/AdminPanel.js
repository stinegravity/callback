import React, { useState, useEffect } from 'react';
import './AdminPanel.css'; // Link to the CSS file for styling

const AdminPanel = () => {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch verification data from the backend
  useEffect(() => {
    fetch('/admin/results')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setVerifications(data.verifications);
        }
      })
      .catch(err => console.error("Error fetching verification data:", err))
      .finally(() => setLoading(false));
  }, []);

  // Handle approve action
  const approveVerification = (transactionGuid) => {
    fetch(`/admin/approve/${transactionGuid}`, {
      method: 'POST',
    })
      .then(response => response.json())
      .then(data => {
        alert(data.message);
        // Filter out the approved verification from the state to remove it
        setVerifications(prevVerifications =>
          prevVerifications.filter(item => item.transactionGuid !== transactionGuid)
        );
      })
      .catch(err => console.error("Error approving verification:", err));
  };

  // Handle reject action
  const rejectVerification = (transactionGuid) => {
    fetch(`/admin/reject/${transactionGuid}`, {
      method: 'POST',
    })
      .then(response => response.json())
      .then(data => {
        alert(data.message);
        // Filter out the rejected verification from the state to remove it
        setVerifications(prevVerifications =>
          prevVerifications.filter(item => item.transactionGuid !== transactionGuid)
        );
      })
      .catch(err => console.error("Error rejecting verification:", err));
  };

  // Loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-panel">
      <header>
        <h1>Admin Verification Panel</h1>
      </header>
      <main>
        <section className="verification-list">
          <table>
            <thead>
              <tr>
                <th>Transaction GUID</th>
                <th>Short GUID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {verifications.length > 0 ? (
                verifications.map((verification) => (
                  <tr key={verification.transactionGuid}>
                    <td>{verification.transactionGuid}</td>
                    <td>{verification.shortGuid}</td>
                    <td>{verification.verified ? 'Verified' : 'Not Verified'}</td>
                    <td>
                      <button
                        className="approve"
                        onClick={() => approveVerification(verification.transactionGuid)}
                      >
                        Approve
                      </button>
                      <button
                        className="reject"
                        onClick={() => rejectVerification(verification.transactionGuid)}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No verification data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
      <footer>
        <p>&copy; 2025 Your Company Name</p>
      </footer>
    </div>
  );
};

export default AdminPanel;
