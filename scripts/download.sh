#!/bin/bash -e

url=$1
title=$2
year=$3

if [[ -z $url ]] ; then
  echo "No url argument supplied"
  exit 1
fi

if [[ -z $title ]] ; then
  echo "No title argument supplied"
  exit 1
fi

if [[ -z $year ]] ; then
  echo "No year argument supplied"
  exit 1
fi

filename="$title.mp4"
download_dir="$title [$year]"

echo "Preparing to download $title"
mkdir -p "$download_dir"

echo "Saving file to $download_dir"
wget -c $url -O "$download_dir/$filename"
