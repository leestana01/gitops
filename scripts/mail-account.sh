#!/bin/bash
# Mail Account Management Script for Stalwart Mail Server
# Usage: ./mail-account.sh [create|list|update|delete] [args]
#
# Commands:
#   create <email> <password>  - Create a new mail account
#   list                       - List all mail accounts
#   update <email> <password>  - Update account password
#   delete <email>             - Delete a mail account

set -euo pipefail

NAMESPACE="mail"
POD_LABEL="app=mail-server"

get_pod() {
  local pod
  pod=$(kubectl get pods -n "$NAMESPACE" -l "$POD_LABEL" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
  if [ -z "$pod" ]; then
    echo "Error: No mail server pod found in namespace $NAMESPACE"
    exit 1
  fi
  echo "$pod"
}

case "${1:-help}" in
  create)
    if [ $# -lt 3 ]; then
      echo "Usage: $0 create <email> <password>"
      echo "Example: $0 create user@klr.kr mypassword"
      exit 1
    fi
    EMAIL="$2"
    PASSWORD="$3"
    POD=$(get_pod)
    echo "Creating account: $EMAIL"
    kubectl exec -n "$NAMESPACE" "$POD" -- stalwart-cli -u admin account create "$EMAIL" "$PASSWORD"
    echo "Account $EMAIL created successfully"
    ;;

  list)
    POD=$(get_pod)
    echo "Mail accounts:"
    kubectl exec -n "$NAMESPACE" "$POD" -- stalwart-cli -u admin account list
    ;;

  update)
    if [ $# -lt 3 ]; then
      echo "Usage: $0 update <email> <new-password>"
      exit 1
    fi
    EMAIL="$2"
    PASSWORD="$3"
    POD=$(get_pod)
    echo "Updating password for: $EMAIL"
    kubectl exec -n "$NAMESPACE" "$POD" -- stalwart-cli -u admin account update "$EMAIL" password "$PASSWORD"
    echo "Password updated for $EMAIL"
    ;;

  delete)
    if [ $# -lt 2 ]; then
      echo "Usage: $0 delete <email>"
      exit 1
    fi
    EMAIL="$2"
    POD=$(get_pod)
    echo "Deleting account: $EMAIL"
    kubectl exec -n "$NAMESPACE" "$POD" -- stalwart-cli -u admin account delete "$EMAIL"
    echo "Account $EMAIL deleted"
    ;;

  help|*)
    echo "Mail Account Management Script"
    echo ""
    echo "Usage: $0 [command] [args]"
    echo ""
    echo "Commands:"
    echo "  create <email> <password>  - Create a new mail account"
    echo "  list                       - List all mail accounts"
    echo "  update <email> <password>  - Update account password"
    echo "  delete <email>             - Delete a mail account"
    echo ""
    echo "Note: Stalwart Mail Server also has a web admin panel at https://mail.klr.kr"
    echo "      Initial admin credentials are set during first setup via the web UI."
    ;;
esac
