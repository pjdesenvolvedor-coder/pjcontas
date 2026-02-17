'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
  WithFieldValue,
  UpdateData,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function handleError(error: any, path: string, operation: 'write' | 'create' | 'update' | 'delete', requestResourceData?: any) {
  const permissionError = new FirestorePermissionError({
    path: path,
    operation: operation,
    requestResourceData: requestResourceData,
  });
  errorEmitter.emit('permission-error', permissionError);
  // Re-throw the original error to allow the caller to handle it
  throw error;
}

/**
 * Performs a setDoc operation. Returns a promise that resolves on completion.
 * Throws an error on failure, which can be caught by the caller.
 */
export function setDocument(docRef: DocumentReference, data: WithFieldValue<any>, options: SetOptions) {
  return setDoc(docRef, data, options).catch(error => {
    const op = options.merge ? 'update' : 'create';
    handleError(error, docRef.path, op, data);
  });
}

/**
 * Performs an addDoc operation. Returns a promise that resolves with the new DocumentReference.
 * Throws an error on failure.
 */
export function addDocument(colRef: CollectionReference, data: WithFieldValue<any>) {
  return addDoc(colRef, data).catch(error => 
    handleError(error, colRef.path, 'create', data)
  );
}

/**
 * Performs an updateDoc operation. Returns a promise that resolves on completion.
 * Throws an error on failure.
 */
export function updateDocument(docRef: DocumentReference, data: UpdateData<any>) {
  return updateDoc(docRef, data).catch(error => 
    handleError(error, docRef.path, 'update', data)
  );
}

/**
 * Performs a deleteDoc operation. Returns a promise that resolves on completion.
 * Throws an error on failure.
 */
export function deleteDocument(docRef: DocumentReference) {
  return deleteDoc(docRef).catch(error => 
    handleError(error, docRef.path, 'delete')
  );
}
