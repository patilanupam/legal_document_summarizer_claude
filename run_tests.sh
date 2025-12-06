#!/bin/bash

# LegalFlow Test Runner Script

set -e  # Exit on error

echo "=================================="
echo "LegalFlow Test Suite"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if TASK_ID is provided
TASK_ID=$1

if [ -n "$TASK_ID" ]; then
  echo "Running tests for task: $TASK_ID"
  echo ""

  # Check if task directory exists
  if [ ! -d "tasks/$TASK_ID" ]; then
    echo -e "${RED}Error: Task directory 'tasks/$TASK_ID' not found${NC}"
    exit 1
  fi

  # Check if task tests exist
  if [ -f "tasks/$TASK_ID/task_tests.js" ]; then
    echo "Running task-specific tests..."
    cd backend
    npx jest "tasks/$TASK_ID/task_tests.js" --forceExit --detectOpenHandles
    TEST_EXIT=$?
    cd ..

    if [ $TEST_EXIT -eq 0 ]; then
      echo -e "${GREEN}✓ Task tests passed${NC}"
      exit 0
    else
      echo -e "${RED}✗ Task tests failed${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Error: No task_tests.js found for $TASK_ID${NC}"
    exit 1
  fi
else
  # Run all baseline tests
  echo "Running all baseline tests..."
  echo ""

  # Backend tests
  echo -e "${YELLOW}Running backend tests...${NC}"
  cd backend
  npm test -- --forceExit --detectOpenHandles
  BACKEND_EXIT=$?
  cd ..

  if [ $BACKEND_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓ Backend tests passed${NC}"
  else
    echo -e "${RED}✗ Backend tests failed${NC}"
  fi

  echo ""
  echo "=================================="
  echo "Test Summary"
  echo "=================================="
  echo -e "Backend: $([ $BACKEND_EXIT -eq 0 ] && echo -e \"${GREEN}PASS${NC}\" || echo -e \"${RED}FAIL${NC}\")"

  # Exit with error if tests failed
  if [ $BACKEND_EXIT -ne 0 ]; then
    echo ""
    echo -e "${RED}Some tests failed${NC}"
    exit 1
  fi

  echo ""
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
